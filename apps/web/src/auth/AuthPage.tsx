import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { Gamepad2, ShieldCheck, Star } from "lucide-react";
import { errorMessage, session } from "../lib/api";
import { useAuth } from "./AuthProvider";
import { Notice, PageHeading } from "../components/ui";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const target: unknown =
    location.state &&
    typeof location.state === "object" &&
    "from" in location.state
      ? location.state.from
      : null;
  const from =
    typeof target === "string" &&
    target.startsWith("/") &&
    !target.startsWith("//") &&
    !target.includes("\\") &&
    !/^\/(login|register)/.test(target)
      ? target
      : "/games";
  const mutation = useMutation({
    mutationFn: () =>
      session.signIn(mode, {
        email,
        password,
        ...(mode === "register" ? { displayName } : {}),
      }),
    onSuccess: () => navigate(from, { replace: true }),
  });
  if (auth.status === "authenticated") return <Navigate to={from} replace />;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!mutation.isPending) mutation.mutate();
  }
  const registering = mode === "register";
  return (
    <div className="mx-auto my-4 grid max-w-5xl items-center gap-12 md:my-8 md:grid-cols-2">
      <section className="hidden md:block">
        <span className="eyebrow">Welcome to your next adventure</span>
        <h2 className="text-5xl">
          Good games.
          <br />
          Honest opinions.
        </h2>
        <p className="text-muted">
          Discover a new favourite, share your experience, and make yourself at
          home.
        </p>
        <ul className="mt-8 grid gap-4 text-sm [&_li]:flex [&_li]:items-center [&_li]:gap-3 [&_svg]:shrink-0 [&_svg]:text-accent">
          <li>
            <Gamepad2 aria-hidden="true" />
            Explore a curated game collection
          </li>
          <li>
            <Star aria-hidden="true" />
            Write reviews and rate your favourites
          </li>
          <li>
            <ShieldCheck aria-hidden="true" />
            Try ordering without real payments
          </li>
        </ul>
      </section>
      <section className="panel mx-auto w-full max-w-lg md:p-8 [&_h1]:text-2xl">
        <PageHeading
          title={registering ? "Create your account" : "Welcome back"}
          description={
            registering
              ? "Join the conversation. Your next game is waiting."
              : "Sign in to review games and manage your demo orders."
          }
        />
        <form onSubmit={submit} className="form-stack">
          {mutation.error && <Notice>{errorMessage(mutation.error)}</Notice>}
          {registering && (
            <label>
              Display name
              <input
                name="displayName"
                autoComplete="nickname"
                required
                minLength={1}
                maxLength={100}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete={registering ? "new-password" : "current-password"}
              required
              minLength={registering ? 8 : 1}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {registering && (
              <span className="field-hint">Use at least 8 characters.</span>
            )}
          </label>
          <button
            className="button w-full"
            disabled={mutation.isPending || auth.status === "loading"}
          >
            {mutation.isPending
              ? "Please wait…"
              : registering
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
        <p className="mt-6 mb-0 text-center text-sm text-muted">
          {registering ? "Already a member? " : "New to GameON? "}
          <Link to={registering ? "/login" : "/register"} state={{ from }}>
            {registering ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </div>
  );
}
