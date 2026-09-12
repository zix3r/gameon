import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Gamepad2,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import { session } from "../lib/api";
import { Notice } from "./ui";

function Header() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1 py-3 whitespace-nowrap md:py-0 ${isActive ? "text-white" : "text-muted"}`;
  return (
    <header className="border-b border-line bg-[#11182a]">
      <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center gap-x-8 px-4 md:flex-nowrap md:px-6">
        <Link
          className="flex shrink-0 items-center text-2xl font-extrabold tracking-tighter text-white"
          to="/"
          aria-label="GameON home"
        >
          <span className="mr-2 grid size-10 place-items-center rounded-xl bg-primary">
            <Gamepad2 aria-hidden="true" />
          </span>
          Game<span className="text-accent">ON</span>
        </Link>
        <button
          ref={toggle}
          className="icon-button ml-auto md:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          id="main-navigation"
          className={`${open ? "flex" : "hidden"} w-full flex-col pb-4 text-sm font-medium md:flex md:flex-1 md:flex-row md:items-center md:gap-5 md:pb-0`}
          aria-label="Main navigation"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              toggle.current?.focus();
            }
          }}
        >
          <NavLink
            className={linkClass}
            to="/games"
            onClick={() => setOpen(false)}
          >
            Discover games
          </NavLink>
          {auth.user && (
            <NavLink
              className={linkClass}
              to="/orders"
              onClick={() => setOpen(false)}
            >
              My orders
            </NavLink>
          )}
          {auth.user?.role === "ADMIN" && (
            <NavLink
              className={linkClass}
              to="/admin"
              onClick={() => setOpen(false)}
            >
              <ShieldCheck size={16} aria-hidden="true" />
              Admin
            </NavLink>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-line pt-4 md:mt-0 md:ml-auto md:border-0 md:pt-0">
            {auth.user ? (
              <>
                <span
                  className="max-w-36 truncate md:hidden lg:block"
                  title={auth.user.displayName}
                >
                  {auth.user.displayName}
                </span>
                <button
                  className="button button-small button-ghost"
                  disabled={auth.status === "loading"}
                  onClick={() => {
                    void session.signOut().catch(() => undefined);
                  }}
                >
                  <LogOut size={15} aria-hidden="true" />
                  Sign out
                </button>
              </>
            ) : auth.status === "loading" ? (
              <span className="text-muted" role="status">
                Restoring session…
              </span>
            ) : (
              <>
                <NavLink to="/login" onClick={() => setOpen(false)}>
                  Sign in
                </NavLink>
                <Link
                  className="button button-small"
                  to="/register"
                  onClick={() => setOpen(false)}
                >
                  Join GameON
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const auth = useAuth();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    main.current?.focus({ preventScroll: true });
  }, [location.pathname]);
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        className="fixed top-2 left-2 z-50 -translate-y-20 rounded-lg bg-white px-4 py-3 text-slate-900 focus:translate-y-0"
        href="#main-content"
      >
        Skip to content
      </a>
      <Header key={location.pathname} />
      <main
        id="main-content"
        ref={main}
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-16 outline-none md:px-6 md:pt-10"
      >
        {auth.error && (
          <Notice>
            {auth.error}{" "}
            <button
              className="text-button"
              onClick={() => void session.restore()}
            >
              Retry session
            </button>
          </Notice>
        )}
        {children}
      </main>
      <footer className="border-t border-line bg-[#080d19] py-8 text-xs text-muted">
        <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-6 px-4 md:px-6">
          <div>
            <Link className="text-lg font-bold text-white" to="/">
              GameON
            </Link>
            <p className="mb-0 mt-2">Find your next favourite game.</p>
          </div>
          <nav className="flex gap-6" aria-label="Footer navigation">
            <Link className="text-muted" to="/games">
              Catalogue
            </Link>
            <a
              className="inline-flex items-center gap-1 text-muted"
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
            >
              API docs <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </nav>
          <p className="mb-0 w-full md:w-auto md:text-right">
            University project
            <br />
            Demo orders only. No payments or downloads.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function AdminNavigation() {
  const style = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-4 py-2 text-sm whitespace-nowrap ${isActive ? "bg-violet-950 text-white" : "text-muted"}`;
  return (
    <nav
      className="mb-6 flex gap-2 overflow-x-auto border-b border-line pb-4"
      aria-label="Administration"
    >
      <NavLink className={style} to="/admin" end>
        Overview
      </NavLink>
      <NavLink className={style} to="/admin/categories">
        Categories
      </NavLink>
      <NavLink className={style} to="/admin/games">
        Games
      </NavLink>
      <NavLink className={style} to="/admin/reviews">
        Reviews
      </NavLink>
      <NavLink className={style} to="/admin/orders">
        All orders
      </NavLink>
    </nav>
  );
}
