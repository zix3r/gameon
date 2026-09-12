import { afterEach, expect, test, vi } from "vitest";
import { ApiError, SessionClient } from "./api";

const user = {
  id: "user-1",
  email: "demo@gameon.test",
  displayName: "Demo",
  role: "USER",
};
const result = (token: string) => ({
  accessToken: token,
  expiresIn: 900,
  tokenType: "Bearer",
  user,
});
const unauthorized = () =>
  Response.json({ message: "Unauthorized" }, { status: 401 });
afterEach(() => vi.unstubAllGlobals());

test("simultaneous protected requests share one refresh and retry with the new token", async () => {
  let refreshes = 0;
  const fetcher = vi.fn(async (url: string, init: RequestInit) => {
    expect(init.credentials).toBe("same-origin");
    if (url === "/api/auth/login") return Response.json(result("old"));
    if (url === "/api/auth/refresh") {
      refreshes++;
      expect(new Headers(init.headers).get("X-GameON-CSRF")).toBe("1");
      await new Promise((resolve) => setTimeout(resolve, 5));
      return Response.json(result("new"));
    }
    return new Headers(init.headers).get("Authorization") === "Bearer new"
      ? Response.json({ items: [] })
      : unauthorized();
  });
  vi.stubGlobal("fetch", fetcher);
  const session = new SessionClient();
  await session.signIn("login", { email: user.email, password: "Demo1234" });
  await Promise.all([
    session.api("/orders", { auth: true }),
    session.api("/orders/one", { auth: true }),
  ]);
  expect(refreshes).toBe(1);
  expect(session.getSnapshot().status).toBe("authenticated");
});

test("logout cannot be undone by an in-flight refresh", async () => {
  let release!: (response: Response) => void;
  let refreshing!: () => void;
  const started = new Promise<void>((resolve) => {
    refreshing = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/auth/login") return Response.json(result("old"));
      if (url === "/api/auth/refresh") {
        refreshing();
        return new Promise<Response>((resolve) => {
          release = resolve;
        });
      }
      return new Response(null, { status: 204 });
    }),
  );
  const session = new SessionClient();
  await session.signIn("login", { email: user.email, password: "Demo1234" });
  const refresh = session.refresh();
  await started;
  const logout = session.signOut();
  release(Response.json(result("new")));
  await Promise.all([refresh, logout]);
  expect(session.getSnapshot()).toEqual({
    status: "guest",
    user: null,
    error: null,
  });
});

test("expired refresh cookies become guest sessions without retry loops", async () => {
  const fetcher = vi.fn(async () => unauthorized());
  vi.stubGlobal("fetch", fetcher);
  const session = new SessionClient();
  await session.restore();
  expect(session.getSnapshot().status).toBe("guest");
  await expect(session.api("/orders", { auth: true })).rejects.toMatchObject({
    status: 401,
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test("validation errors and network failures remain actionable", async () => {
  const session = new SessionClient();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json(
        { message: ["Invalid email", "Password too short"] },
        { status: 400 },
      ),
    ),
  );
  await expect(
    session.signIn("register", { email: "bad", password: "bad" }),
  ).rejects.toThrow("Invalid email. Password too short");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("offline");
    }),
  );
  await expect(session.api("/games")).rejects.toBeInstanceOf(ApiError);
  await session.restore();
  expect(session.getSnapshot().status).toBe("error");
});

test("a second unauthorized response clears the session without another retry", async () => {
  let refreshes = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/auth/login") return Response.json(result("old"));
      if (url === "/api/auth/refresh") {
        refreshes++;
        return Response.json(result("new"));
      }
      return unauthorized();
    }),
  );
  const session = new SessionClient();
  await session.signIn("login", { email: user.email, password: "Demo1234" });
  await expect(session.api("/orders", { auth: true })).rejects.toMatchObject({
    status: 401,
  });
  expect(refreshes).toBe(1);
  expect(session.getSnapshot().status).toBe("guest");
});
