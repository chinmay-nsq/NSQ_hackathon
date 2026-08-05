import Groq from "groq-sdk";
import { env } from "./env";

let client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is not set — add it to backend/.env");
  }
  if (!client) {
    client = new Groq({ apiKey: env.groqApiKey });
  }
  return client;
}

export const GROQ_MODEL = "llama-3.3-70b-versatile";
