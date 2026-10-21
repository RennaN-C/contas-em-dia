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
        ...options?.headers
      }
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor", 0);
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
