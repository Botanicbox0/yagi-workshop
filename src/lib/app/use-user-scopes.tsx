"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Scope } from "@/lib/app/scopes";

// Note: filename uses .tsx (not the DP-specified .ts) because the Provider
// component contains JSX. Import path stays `@/lib/app/use-user-scopes`.

const UserScopesContext = createContext<Scope[] | null>(null);

export function UserScopesProvider({
  value,
  children,
}: {
  value: Scope[];
  children: ReactNode;
}) {
  return (
    <UserScopesContext.Provider value={value}>
      {children}
    </UserScopesContext.Provider>
  );
}

export function useUserScopes(): Scope[] {
  const ctx = useContext(UserScopesContext);
  if (ctx === null) {
    if (process.env.NODE_ENV === "development") {
      throw new Error(
        "useUserScopes called outside UserScopesProvider. Wrap app layout children.",
      );
    }
    return [];
  }
  return ctx;
}
