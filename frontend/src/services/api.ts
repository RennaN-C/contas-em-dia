const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export type ApiIssue = {
  path: string;
  message: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: ApiIssue[] = []
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

async function readErrorBody(response: Response) {
  try {
    return (await response.json()) as { message?: string; issues?: ApiIssue[] };
  } catch {
    return {};
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options?.headers
      }
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor", 0);
  }

  if (response.status === 401 && authToken) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new ApiError(
      body.message ?? "Erro ao comunicar com a API",
      response.status,
      body.issues ?? []
    );
  }

  return response.json() as Promise<T>;
}
