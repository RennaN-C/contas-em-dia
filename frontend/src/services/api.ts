const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  });

  if (!response.ok) {
    throw new Error("Erro ao comunicar com a API");
  }

  return response.json() as Promise<T>;
}
