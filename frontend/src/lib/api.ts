const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ApiSuccessEnvelope<T> {
  status: number;
  message: string;
  data: T;
  success: true;
}

interface ApiErrorEnvelope {
  status: number;
  success: false;
  error: string;
  message: string;
}

export class ApiRequestError extends Error {
  status: number;
  errorLabel: string;

  constructor(envelope: ApiErrorEnvelope) {
    super(envelope.message);
    this.status = envelope.status;
    this.errorLabel = envelope.error;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = (await res.json()) as ApiSuccessEnvelope<T> | ApiErrorEnvelope;

  if (!body.success) {
    throw new ApiRequestError(body);
  }

  return body.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
};
