import Groq from "groq-sdk";

export const GROQ_MODEL = "llama-3.3-70b-versatile";

// Any number of keys, not just the primary — GROQ_API_KEY_2, _3, _4, ...
// keep incrementing as long as one is set. Lets you add more later without
// a code change.
function loadApiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY);

  let i = 2;
  while (process.env[`GROQ_API_KEY_${i}`]) {
    keys.push(process.env[`GROQ_API_KEY_${i}`]!);
    i++;
  }
  return keys;
}

const apiKeys = loadApiKeys();
const clients = new Map<string, Groq>();

// Rotates on every call so load actually spreads across keys instead of
// hammering the first one until it rate-limits — withGroqRetry below still
// walks the rest of the pool if the one it lands on is already limited.
let nextKeyIndex = 0;

function clientForKey(apiKey: string): Groq {
  let client = clients.get(apiKey);
  if (!client) {
    client = new Groq({ apiKey });
    clients.set(apiKey, client);
  }
  return client;
}

function isRateLimitError(err: unknown): boolean {
  return err instanceof Groq.APIError && err.status === 429;
}

/**
 * Runs `fn` against one Groq client, rotating to the next configured API
 * key and retrying if that key is rate-limited (429) — tries every
 * configured key once before giving up. A single-key setup behaves exactly
 * as before (one attempt, real errors still throw).
 */
export async function withGroqRetry<T>(fn: (client: Groq) => Promise<T>): Promise<T> {
  if (apiKeys.length === 0) {
    throw new Error("No Groq API key is set — add GROQ_API_KEY to backend/.env");
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
