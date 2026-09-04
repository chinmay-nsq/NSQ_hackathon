import OpenAI from "openai";

// The "mini" tier — cheap, fast, and fully compatible with the standard
// Chat Completions shape (temperature, response_format, tools) this app's
// AIProvider interface relies on. Override via OPENAI_MODEL if you'd rather
// point at a different OpenAI model.
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Any number of keys, not just the primary — OPENAI_API_KEY_2, _3, _4, ...
// keep incrementing as long as one is set. Mirrors groqClient's pattern so
// swapping which provider is "primary" doesn't change the operational model.
function loadApiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.OPENAI_API_KEY) keys.push(process.env.OPENAI_API_KEY);

  let i = 2;
  while (process.env[`OPENAI_API_KEY_${i}`]) {
    keys.push(process.env[`OPENAI_API_KEY_${i}`]!);
    i++;
  }
  return keys;
}

const apiKeys = loadApiKeys();
const clients = new Map<string, OpenAI>();

// Rotates on every call so load actually spreads across keys instead of
// hammering the first one until it rate-limits — withOpenAIRetry below still
// walks the rest of the pool if the one it lands on is already limited.
let nextKeyIndex = 0;

function clientForKey(apiKey: string): OpenAI {
  let client = clients.get(apiKey);
  if (!client) {
    client = new OpenAI({ apiKey });
    clients.set(apiKey, client);
  }
  return client;
}

function isRateLimitError(err: unknown): boolean {
  return err instanceof OpenAI.APIError && err.status === 429;
}

/**
 * Runs `fn` against one OpenAI client, rotating to the next configured API
 * key and retrying if that key is rate-limited (429) — tries every
 * configured key once before giving up. A single-key setup behaves exactly
 * as before (one attempt, real errors still throw).
 */
export async function withOpenAIRetry<T>(fn: (client: OpenAI) => Promise<T>): Promise<T> {
  if (apiKeys.length === 0) {
    throw new Error("No OpenAI API key is set — add OPENAI_API_KEY to backend/.env");
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < apiKeys.length; attempt++) {
    const key = apiKeys[nextKeyIndex];
    nextKeyIndex = (nextKeyIndex + 1) % apiKeys.length;

    try {
      return await fn(clientForKey(key));
    } catch (err) {
      lastErr = err;
      if (!isRateLimitError(err)) throw err;
      // Rate-limited on this key — loop continues and tries the next one.
    }
  }

  throw lastErr;
}
