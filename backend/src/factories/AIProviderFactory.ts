import { withGroqRetry, GROQ_MODEL } from "@/config/groqClient";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the tool's arguments object. */
  parameters: Record<string, unknown>;
}

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  toolCallId: string;
  /** Serialized (usually JSON.stringify'd) result the model gets back as this tool's output. */
  content: string;
}

/** Either the model produced a final reply, or it wants one or more tools invoked before replying. */
export type ChatWithToolsResult =
  | { kind: "reply"; text: string }
  | { kind: "tool_calls"; calls: ToolCallRequest[] };

export interface AIProvider {
  completeJSON<T>(system: string, user: string): Promise<T>;
  completeText(system: string, user: string): Promise<string>;
  /** Multi-turn: system prompt + prior conversation history, returns the next assistant reply. */
  completeChat(system: string, history: ChatTurn[]): Promise<string>;
  /** Multi-turn with tool-calling: model may ask for tools instead of replying directly. */
  completeChatWithTools(system: string, history: ChatTurn[], tools: ToolDefinition[]): Promise<ChatWithToolsResult>;
  /** Continues after tool results are fed back — returns the model's final natural-language reply. */
  completeChatToolReply(
    system: string,
    history: ChatTurn[],
    calls: ToolCallRequest[],
    results: ToolCallResult[]
  ): Promise<string>;
}

class GroqProvider implements AIProvider {
  async completeJSON<T>(system: string, user: string): Promise<T> {
    const completion = await withGroqRetry((groq) =>
      groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.9,
      })
    );
    const raw = completion.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as T;
  }

  async completeText(system: string, user: string): Promise<string> {
    const completion = await withGroqRetry((groq) =>
      groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.8,
      })
    );
    return completion.choices[0]?.message?.content ?? "";
  }

  async completeChat(system: string, history: ChatTurn[]): Promise<string> {
    const completion = await withGroqRetry((groq) =>
      groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: "system", content: system }, ...history],
        temperature: 0.85,
      })
    );
    return completion.choices[0]?.message?.content ?? "";
  }

  async completeChatWithTools(
    system: string,
    history: ChatTurn[],
    tools: ToolDefinition[]
  ): Promise<ChatWithToolsResult> {
    try {
      const completion = await withGroqRetry((groq) =>
        groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [{ role: "system", content: system }, ...history],
          temperature: 0.7,
          tools: tools.map((t) => ({
            type: "function" as const,
            function: { name: t.name, description: t.description, parameters: t.parameters },
          })),
        })
      );

      const message = completion.choices[0]?.message;
      if (message?.tool_calls && message.tool_calls.length > 0) {
        return {
          kind: "tool_calls",
          calls: message.tool_calls.map((c) => ({
            id: c.id,
            name: c.function.name,
            // Model-generated JSON — malformed args fail closed as {} rather
            // than crashing the whole chat turn.
            arguments: safeParseJSON(c.function.arguments),
          })),
        };
      }

      // Groq doesn't always reject a malformed pseudo-tool-call as a 400 —
      // sometimes it comes back as a normal successful completion with the
      // `<function=...>` text just sitting inside message.content alongside
      // (or instead of) the real reply. Since the model clearly intended a
      // tool call here, actually recover and run it rather than showing the
      // raw leaked syntax to the user.
      const leaked = extractLeakedToolCall(message?.content ?? "");
      if (leaked) return { kind: "tool_calls", calls: [leaked] };

      return { kind: "reply", text: stripLeakedToolCallSyntax(message?.content ?? "") };
    } catch (err) {
      // Llama 3.3 on Groq occasionally emits a tool call in its own
      // pseudo-XML text format instead of a real structured tool call
      // (e.g. `<function=navigate{"destination": "rewards"}</function>`) —
      // Groq's API rejects that generation outright as a 400
      // "tool_use_failed" instead of returning it as a normal tool call.
      // The malformed text is still recoverable from the error body, so
      // parse it out and treat it as the intended tool call rather than
      // losing the user's request to a hard error.
      const recovered = tryRecoverMalformedToolCall(err);
      if (recovered) return { kind: "tool_calls", calls: [recovered] };
      throw err;
    }
  }

  async completeChatToolReply(
    system: string,
    history: ChatTurn[],
    calls: ToolCallRequest[],
    results: ToolCallResult[]
  ): Promise<string> {
    const completion = await withGroqRetry((groq) =>
      groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: system },
          ...history,
          {
            role: "assistant",
            content: null,
            tool_calls: calls.map((c) => ({
              id: c.id,
              type: "function" as const,
              function: { name: c.name, arguments: JSON.stringify(c.arguments) },
            })),
          },
          ...results.map((r) => ({
            role: "tool" as const,
            tool_call_id: r.toolCallId,
            content: r.content,
          })),
        ],
        temperature: 0.8,
      })
    );
    // Safety net only, no recovery loop — this is already the reply that
    // follows a tool's real result, so another tool call here would be a
    // model hallucination rather than a genuine second intent.
    return stripLeakedToolCallSyntax(completion.choices[0]?.message?.content ?? "");
  }
}

function safeParseJSON(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

// Matches Llama-on-Groq's malformed pseudo-tool-call text, e.g.
// `<function=navigate{"destination": "rewards"}</function>` — captures the
// function name and the raw JSON arguments blob separately. Two places see
// this: Groq sometimes rejects the whole generation outright as a 400
// tool_use_failed (see tryRecoverMalformedToolCall), and sometimes it comes
// back as a normal 200 with this text just sitting inside message.content
// (see extractLeakedToolCall/stripLeakedToolCallSyntax) — same underlying
// model slip, two different ways the API can surface it.
const MALFORMED_TOOL_CALL_PATTERN = /<function=([\w-]+)(\{[\s\S]*?\})\s*<\/function>/;

function parseLeakedFunctionSyntax(text: string): ToolCallRequest | null {
  const match = text.match(MALFORMED_TOOL_CALL_PATTERN);
  if (!match) return null;
  const [, name, argsJSON] = match;
  return { id: `recovered-${Date.now()}`, name, arguments: safeParseJSON(argsJSON) };
}

/**
 * Best-effort recovery from Groq's tool_use_failed 400 — returns null if the
 * error isn't this specific, recoverable shape. Checked structurally
 * (duck-typed fields) rather than via `instanceof Groq.APIError`: in
 * practice that check has failed to match even genuine Groq errors here
 * (observed both compiled and under tsx), almost certainly a module
 * identity mismatch between however groq-sdk got loaded for the thrown
 * error vs. this file's own import — safer to not depend on class identity
 * matching at all.
 */
function tryRecoverMalformedToolCall(err: unknown): ToolCallRequest | null {
  if (typeof err !== "object" || err === null) return null;
  const body = (err as { error?: unknown }).error as
    | { code?: string; failed_generation?: string }
    | undefined;
  if (body?.code !== "tool_use_failed" || typeof body.failed_generation !== "string") return null;
  return parseLeakedFunctionSyntax(body.failed_generation);
}

/** Same recovery, but for when the malformed syntax leaked into a normal (200) message.content instead of triggering Groq's own validation error. */
function extractLeakedToolCall(content: string): ToolCallRequest | null {
  return parseLeakedFunctionSyntax(content);
}

/** Safety net: strips any leaked `<function=...>` syntax out of a reply that's shown to the user, in case it couldn't be parsed into a real recovered call. */
function stripLeakedToolCallSyntax(text: string): string {
  return text.replace(MALFORMED_TOOL_CALL_PATTERN, "").trim();
}

let cachedProvider: AIProvider | null = null;

/**
 * Returns the active AI provider. Swapping providers (e.g. to OpenAI/Claude)
 * only requires a new class here — callers depend on the AIProvider interface only.
 */
export function getAIProvider(): AIProvider {
  if (!cachedProvider) {
    cachedProvider = new GroqProvider();
  }
  return cachedProvider;
}
