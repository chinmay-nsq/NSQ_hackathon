import Groq from "groq-sdk";
import { getGroqClient, GROQ_MODEL } from "@/config/groqClient";

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
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as T;
  }

  async completeText(system: string, user: string): Promise<string> {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.8,
    });
    return completion.choices[0]?.message?.content ?? "";
  }

  async completeChat(system: string, history: ChatTurn[]): Promise<string> {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: system }, ...history],
      temperature: 0.85,
    });
    return completion.choices[0]?.message?.content ?? "";
  }

  async completeChatWithTools(
    system: string,
    history: ChatTurn[],
    tools: ToolDefinition[]
  ): Promise<ChatWithToolsResult> {
    const groq = getGroqClient();
    try {
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: "system", content: system }, ...history],
        temperature: 0.7,
        tools: tools.map((t) => ({
          type: "function" as const,
          function: { name: t.name, description: t.description, parameters: t.parameters },
        })),
      });

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

      return { kind: "reply", text: message?.content ?? "" };
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
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
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
    });
    return completion.choices[0]?.message?.content ?? "";
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

// Matches Groq/Llama's malformed pseudo-tool-call text, e.g.
// `<function=navigate{"destination": "rewards"}</function>` — captures the
// function name and the raw JSON arguments blob separately.
const MALFORMED_TOOL_CALL_PATTERN = /<function=([\w-]+)(\{[\s\S]*\})<\/function>/;

/** Best-effort recovery from Groq's tool_use_failed 400 — returns null if the error isn't this specific, recoverable shape. */
function tryRecoverMalformedToolCall(err: unknown): ToolCallRequest | null {
  if (!(err instanceof Groq.APIError)) return null;
  const body = err.error as { code?: string; failed_generation?: string } | undefined;
  if (body?.code !== "tool_use_failed" || typeof body.failed_generation !== "string") return null;

  const match = body.failed_generation.match(MALFORMED_TOOL_CALL_PATTERN);
  if (!match) return null;

  const [, name, argsJSON] = match;
  return { id: `recovered-${Date.now()}`, name, arguments: safeParseJSON(argsJSON) };
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
