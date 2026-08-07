import { create } from "zustand";
import { Employee } from "@/lib/types";
import { api } from "@/lib/api";

// ADMIN is intentionally excluded — never selectable at signup, only granted
// by an existing admin.
export type SelfRegisterableRole = "EMPLOYEE" | "MANAGER";

interface AuthState {
  employee: Employee | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: SelfRegisterableRole) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  employee: null,
  status: "idle",

  async login(email, password) {
    set({ status: "loading" });
    // The login response is a partial employee (id/email/name only) — fetch
    // the full profile before marking the session authenticated, so every
    // consumer of `employee` (coins, xp, role, ...) sees real data immediately.
    await api.post("/auth/login", { email, password });
    await get().fetchMe();
  },

  async register(email, password, name, role) {
    set({ status: "loading" });
    await api.post("/auth/register", { email, password, name, role });
    await get().fetchMe();
  },

  async logout() {
    await api.post("/auth/logout");
    set({ employee: null, status: "unauthenticated" });
  },

  async fetchMe() {
    set((state) => ({ status: state.status === "idle" ? "loading" : state.status }));
    try {
      const data = await api.get<{ employee: Employee }>("/auth/me");
      set({ employee: data.employee, status: "authenticated" });
    } catch {
      set({ employee: null, status: "unauthenticated" });
    }
  },
}));
