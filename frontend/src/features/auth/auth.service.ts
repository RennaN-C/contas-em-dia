import { api } from "../../services/api";
import type { User } from "../../types/user";
import type { Session } from "./session";

export type RegisterInput = {
  nome: string;
  email: string;
  senha: string;
};

export type LoginInput = {
  email: string;
  senha: string;
};

export async function registerUser(input: RegisterInput): Promise<User> {
  const { user } = await api<{ user: User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return user;
}

export function loginUser(input: LoginInput): Promise<Session> {
  return api<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function fetchCurrentUser(): Promise<User> {
  const { user } = await api<{ user: User }>("/users/me");

  return user;
}
export async function updateCurrentUser(input:{nome:string;email:string}): Promise<User> {
  const {user} = await api<{user:User}>('/users/me',{method:'PUT',body:JSON.stringify(input)});
  return user;
}
