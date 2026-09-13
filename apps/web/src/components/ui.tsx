import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  LoaderCircle,
  Star,
  X,
} from "lucide-react";
import { errorMessage } from "../lib/api";
import { type Game, type PageLinks } from "../lib/types";

export function DataTable({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className="overflow-x-auto rounded-xl border border-line"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table className="w-full text-left text-sm [&_th]:bg-slate-800 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted [&_th]:uppercase [&_th]:p-4 [&_td]:border-t [&_td]:border-line [&_td]:p-4 [&_tbody_tr]:bg-surface [&_tbody_tr:hover]:bg-slate-800/60">
        {children}
      </table>
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 px-6 py-14 text-muted"
      role="status"
    >
      <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  error,
  message,
  title = "Something went wrong",
  onRetry,
}: {
  error?: unknown;
  message?: string;
  title?: string;
  onRetry?: () => void;
}) {
  return (
    <section
      className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center"
      role="alert"
    >
      <AlertCircle
        className="mx-auto mb-4 size-8 text-accent"
        aria-hidden="true"
      />
      <h2>{title}</h2>
      <p className="mx-auto max-w-xl text-muted">
        {message ?? errorMessage(error)}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {onRetry && (
          <button className="button" onClick={onRetry}>
            Try again
          </button>
        )}
        <Link className="button button-ghost" to="/games">
          Browse games
        </Link>
      </div>
    </section>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <Gamepad2
        className="mx-auto mb-4 size-8 text-accent"
        aria-hidden="true"
      />
      <h2>{title}</h2>
      <div className="text-muted">{children}</div>
    </section>
  );
}

export function Notice({
  children,
  kind = "error",
}: {
  children: ReactNode;
  kind?: "error" | "success" | "info";
}) {
  const colors = {
    error: "border-rose-800 bg-rose-950/60 text-rose-200",
    success: "border-emerald-800 bg-emerald-950/60 text-emerald-200",
    info: "border-violet-800 bg-violet-950/40 text-violet-200",
  };
  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-lg border p-4 text-sm wrap-break-word ${colors[kind]}`}
      role={kind === "error" ? "alert" : "status"}
    >
      {kind === "success" ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      )}
      <div>{children}</div>
    </div>
  );
}

export function PageHeading({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children?: ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} · GameON`;
  }, [title]);
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && (
          <p className="mb-0 max-w-2xl text-muted">{description}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export function BackLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link className="mb-6 inline-flex items-center gap-2 text-sm" to={to}>
      <ArrowLeft size={16} aria-hidden="true" />
      {children}
    </Link>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  busy = false,
  label = "Pages",
  links,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number, href?: string) => void;
  links: PageLinks;
  busy?: boolean;
  label?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages === 1 && page === 1) return null;
  return (
    <nav
      className="mt-8 flex items-center justify-center gap-2 text-xs text-muted sm:gap-5 sm:text-sm"
      aria-label={label}
    >
      <button
        className="button button-ghost"
        disabled={busy || !links.prev}
        onClick={() => {
          if (links.prev)
            onChange(
              Number(
                new URL(
                  links.prev.href,
                  window.location.origin,
                ).searchParams.get("page"),
              ),
              links.prev.href,
            );
        }}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Previous
      </button>
      <span>
        {page > pages ? "Page unavailable" : `Page ${page} of ${pages}`}
      </span>
      <button
        className="button button-ghost"
        disabled={busy || !links.next}
        onClick={() => {
          if (links.next)
            onChange(
              Number(
                new URL(
                  links.next.href,
                  window.location.origin,
                ).searchParams.get("page"),
              ),
              links.next.href,
            );
        }}
      >
        Next
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}

export function GameCover({
  game,
  className = "",
  eager = false,
}: {
  game: Pick<Game, "title" | "imageUrl">;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <div
      className={`aspect-[264/374] overflow-hidden bg-slate-800 ${className}`}
    >
      {game.imageUrl && game.imageUrl !== failed ? (
        <img
          className="h-full w-full object-cover"
          src={game.imageUrl}
          alt={`${game.title} cover`}
          loading={eager ? "eager" : "lazy"}
          width={264}
          height={374}
          onError={() => setFailed(game.imageUrl)}
        />
      ) : (
        <div
          className="flex h-full flex-col items-center justify-center gap-3 bg-linear-to-br from-slate-800 to-violet-950 p-3 text-center text-xs text-muted"
          role="img"
          aria-label={`${game.title}: cover unavailable`}
        >
          <Gamepad2 className="size-10" aria-hidden="true" />
          <span>Cover unavailable</span>
        </div>
      )}
    </div>
  );
}

export function Rating({
  value,
  count,
}: {
  value: number | null;
  count?: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-amber-300"
      aria-label={
        value === null
          ? "Not rated yet"
          : `${value.toFixed(1)} out of 5${count === undefined ? "" : `, ${count} reviews`}`
      }
    >
      <Star
        size={15}
        fill={value === null ? "none" : "currentColor"}
        aria-hidden="true"
      />
      <strong>{value === null ? "New" : value.toFixed(1)}</strong>
      {count !== undefined && <span className="text-muted">({count})</span>}
    </span>
  );
}

export function Dialog({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (element && !element.open) element.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-xl rounded-2xl border border-slate-600 bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
        <h2 id={titleId} className="mb-0 text-xl">
          {title}
        </h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
          disabled={busy}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>,
    document.body,
  );
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  pending: boolean;
  error: unknown;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog title={title} onClose={onClose} busy={pending}>
      {children}
      {!!error && <Notice>{errorMessage(error)}</Notice>}
      <div className="dialog-actions">
        <button
          className="button button-ghost"
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </button>
        <button
          className="button button-danger"
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "Deleting…" : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
