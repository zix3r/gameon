import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router";
import { session, type SessionState } from "../lib/api";
import { ErrorState, Loading } from "../components/ui";

const AuthContext = createContext<SessionState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const client = useQueryClient();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    void session.restore();
  }, []);
  useEffect(() => {
    const identity = state.user ? `${state.user.id}:${state.user.role}` : null;
    if (identity !== previous.current) {
      const staleIdentity = {
        queryKey: ["private"],
        predicate: (query: Query) =>
          query.queryKey[1] !== state.user?.id ||
          query.queryKey[2] !== state.user?.role,
      };
      void client.cancelQueries(staleIdentity);
      client.removeQueries(staleIdentity);
      previous.current = identity;
    }
  }, [client, state.user]);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error("AuthProvider is missing");
  return state;
}

export function RequireAuth({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === "loading")
    return <Loading label="Checking your session…" />;
  if (auth.status === "error")
    return (
      <ErrorState
        message={auth.error ?? "Session unavailable."}
        onRetry={() => void session.restore()}
      />
    );
  if (!auth.user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  if (admin && auth.user.role !== "ADMIN")
    return (
      <ErrorState
        title="Access restricted"
        message="This area is available to administrators only."
      />
    );
  return children;
}
