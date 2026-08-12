import { getGroqClient, GROQ_MODEL } from "@/config/groqClient";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AIProvider {
  completeJSON<T>(system: string, user: string): Promise<T>;
  completeText(system: string, user: string): Promise<string>;
  /** Multi-turn: system prompt + prior conversation history, returns the next assistant reply. */
  completeChat(system: string, history: ChatTurn[]): Promise<string>;
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
