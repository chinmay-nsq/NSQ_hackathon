import { create } from "zustand";
import { Employee } from "@/lib/types";
import { api } from "@/lib/api";

interface AuthState {
  employee: Employee | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  employee: null,
  status: "idle",

  async login(email, password) {
    set({ status: "loading" });
    const data = await api.post<{ employee: Employee }>("/auth/login", { email, password });
    set({ employee: data.employee, status: "authenticated" });
  },

  async register(email, password, name) {
    set({ status: "loading" });
    const data = await api.post<{ employee: Employee }>("/auth/register", { email, password, name });
    set({ employee: data.employee, status: "authenticated" });
  },

  async logout() {
    await api.post("/auth/logout");
    set({ employee: null, status: "unauthenticated" });
  },

  async fetchMe() {
    set({ status: "loading" });
    try {
      const data = await api.get<{ employee: Employee }>("/auth/me");
      set({ employee: data.employee, status: "authenticated" });
    } catch {
      set({ employee: null, status: "unauthenticated" });
    }
  },
}));
