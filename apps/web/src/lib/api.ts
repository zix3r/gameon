import { type AuthResult, type User } from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
  csrf?: boolean;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      signal: options.signal,
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.csrf ? { "X-GameON-CSRF": "1" } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      0,
      "Unable to reach GameON. Check your connection and try again.",
    );
  }
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? body.message
        : null;
    throw new ApiError(
      response.status,
      response.status === 429
        ? "Too many requests. Please wait a moment and try again."
        : Array.isArray(message)
          ? message.join(". ")
          : typeof message === "string"
            ? message
            : "The request could not be completed.",
    );
  }
  if (body === null)
    throw new ApiError(502, "The server returned an unexpected response.");
  return body as T;
}

export interface SessionState {
  status: "loading" | "authenticated" | "guest" | "error";
  user: User | null;
  error: string | null;
}

export class SessionClient {
  private token: string | undefined;
  private revision = 0;
  private state: SessionState = { status: "loading", user: null, error: null };
  private listeners = new Set<() => void>();
  private refreshing: Promise<User | null> | undefined;
  private cookieQueue: Promise<unknown> = Promise.resolve();

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private set(state: SessionState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
  private accept(result: AuthResult) {
    this.token = result.accessToken;
    this.set({ status: "authenticated", user: result.user, error: null });
  }
  private cookies<T>(operation: () => Promise<T>): Promise<T> {
    const run = () =>
      typeof navigator !== "undefined" && navigator.locks
        ? navigator.locks.request("gameon-session", operation)
        : operation();
    const result = this.cookieQueue.then(run, run);
    this.cookieQueue = result.catch(() => undefined);
    return result;
  }

  restore = async () => {
    try {
      await this.refresh();
    } catch {
      return;
    }
  };

  refresh(): Promise<User | null> {
    if (this.refreshing) return this.refreshing;
    const revision = this.revision;
    const operation = this.cookies(async () => {
      if (revision !== this.revision) return null;
      try {
        const result = await request<AuthResult>("/auth/refresh", {
          method: "POST",
          csrf: true,
        });
        if (revision !== this.revision) return null;
        this.accept(result);
        return result.user;
      } catch (error) {
        if (revision !== this.revision) return null;
        if (error instanceof ApiError && error.status === 401) {
          this.token = undefined;
          this.set({ status: "guest", user: null, error: null });
          return null;
        }
        this.set({
          ...this.state,
          status: this.state.user ? "authenticated" : "error",
          error: "Your session could not be restored. Please try again.",
        });
        throw error;
      }
    });
    this.refreshing = operation;
    void operation
      .finally(() => {
        if (this.refreshing === operation) this.refreshing = undefined;
      })
      .catch(() => undefined);
    return operation;
  }

  async signIn(
    mode: "login" | "register",
    body: { email: string; password: string; displayName?: string },
  ) {
    const revision = ++this.revision;
    this.token = undefined;
    this.set({ status: "loading", user: null, error: null });
    try {
      const result = await this.cookies(() =>
        request<AuthResult>(`/auth/${mode}`, {
          method: "POST",
          csrf: true,
          body,
        }),
      );
      if (revision !== this.revision)
        throw new ApiError(409, "Your session changed. Please try again.");
      this.accept(result);
      return result.user;
    } catch (error) {
      if (revision === this.revision)
        this.set({ status: "guest", user: null, error: null });
      throw error;
    }
  }

  async signOut() {
    const revision = ++this.revision;
    const previous = this.state;
    const previousToken = this.token;
    this.token = undefined;
    this.set({ status: "loading", user: previous.user, error: null });
    try {
      await this.cookies(() =>
        request<void>("/auth/logout", { method: "POST", csrf: true }),
      );
      if (revision === this.revision)
        this.set({ status: "guest", user: null, error: null });
    } catch (error) {
      if (revision === this.revision) {
        this.token = previousToken;
        this.set({
          ...previous,
          error: "Sign-out could not be confirmed. Please try again.",
        });
      }
      throw error;
    }
  }

  async api<T>(
    path: string,
    options: Omit<RequestOptions, "token" | "csrf"> & { auth?: boolean } = {},
  ): Promise<T> {
    if (!options.auth) return request<T>(path, options);
    const revision = this.revision;
    if (!this.token) await this.refresh();
    if (!this.token || revision !== this.revision)
      throw new ApiError(401, "Please sign in to continue.");
    const token = this.token;
    try {
      return await request<T>(path, { ...options, token });
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.status !== 401 ||
        revision !== this.revision ||
        options.signal?.aborted
      )
        throw error;
      if (this.token === token) await this.refresh();
      if (!this.token || revision !== this.revision)
        throw new ApiError(401, "Your session ended. Please sign in again.");
      try {
        return await request<T>(path, { ...options, token: this.token });
      } catch (retryError) {
        if (
          retryError instanceof ApiError &&
          retryError.status === 401 &&
          revision === this.revision
        ) {
          this.token = undefined;
          this.set({ status: "guest", user: null, error: null });
        }
        throw retryError;
      }
    }
  }
}

export const session = new SessionClient();
export const api = session.api.bind(session);
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
