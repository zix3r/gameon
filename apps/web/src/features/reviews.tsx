import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { api, errorMessage } from "../lib/api";
import { date, invalidateReviews, useGame } from "../lib/queries";
import { type Page, type Review } from "../lib/types";
import {
  BackLink,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErrorState,
  Loading,
  Notice,
  PageHeading,
  Pagination,
} from "../components/ui";

export function ReviewEditor({
  gameId,
  review,
  onClose,
}: {
  gameId: string;
  review?: Review;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [text, setText] = useState(review?.text ?? "");
  const [rating, setRating] = useState(review?.rating ?? 5);
  const mutation = useMutation({
    mutationFn: () =>
      api<Review>(`/games/${gameId}/reviews${review ? `/${review.id}` : ""}`, {
        method: review ? "PATCH" : "POST",
        auth: true,
        body: { text: text.trim(), rating },
      }),
    onSuccess: async () => {
      await invalidateReviews(client, gameId);
      onClose();
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!mutation.isPending) mutation.mutate();
  }
  return (
    <Dialog
      title={review ? "Edit your review" : "Write a review"}
      onClose={onClose}
      busy={mutation.isPending}
    >
      <form className="form-stack" onSubmit={submit}>
        {mutation.error && <Notice>{errorMessage(mutation.error)}</Notice>}
        <fieldset disabled={mutation.isPending}>
          <legend className="mb-2 text-sm font-medium">Your rating</legend>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className="cursor-pointer p-2.5">
                <input
                  className="peer sr-only"
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  aria-label={`${value} out of 5 stars`}
                />
                <Star
                  aria-hidden="true"
                  className={`size-6 rounded-sm transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-violet-300 ${
                    value <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-400"
                  }`}
                />
              </label>
            ))}
          </div>
          <span className="field-hint">
            {rating} / 5 —{" "}
            {["Poor", "Fair", "Good", "Great", "Excellent"][rating - 1]}
          </span>
        </fieldset>
        <label>
          Your review
          <textarea
            required
            minLength={1}
            maxLength={5000}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="What did you enjoy? What could be better?"
            rows={6}
          />
          <span className="field-hint">
            One review per game. Keep it helpful and respectful. {text.length}
            /5000
          </span>
        </label>
        <div className="dialog-actions">
          <button
            type="button"
            className="button button-ghost"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button"
            disabled={mutation.isPending || !text.trim()}
          >
            {mutation.isPending
              ? "Saving…"
              : review
                ? "Save review"
                : "Publish review"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function ReviewCard({
  review,
  full = false,
  moderation = false,
  onDeleted,
}: {
  review: Review;
  full?: boolean;
  moderation?: boolean;
  onDeleted?: () => void;
}) {
  const auth = useAuth();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const own = auth.user?.id === review.authorId;
  const mutation = useMutation({
    mutationFn: () =>
      api<void>(`/games/${review.gameId}/reviews/${review.id}`, {
        method: "DELETE",
        auth: true,
      }),
    onSuccess: () => {
      setDeleting(false);
      onDeleted?.();
      void invalidateReviews(client, review.gameId);
    },
  });
  return (
    <article className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full bg-violet-950 font-bold text-violet-200"
            aria-hidden="true"
          >
            {review.author.displayName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <strong className="text-sm wrap-break-word">
              {review.author.displayName}
            </strong>
            {own && <span className="ml-2 text-xs text-accent">You</span>}
            <time
              className="block text-xs text-muted"
              dateTime={review.createdAt}
            >
              {date(review.createdAt)}
            </time>
          </div>
        </div>
        <span
          role="img"
          aria-label={`${review.rating} out of 5 stars`}
          className="flex shrink-0 gap-0.5"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              aria-hidden="true"
              className={`size-4 ${
                value <= review.rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-400"
              }`}
            />
          ))}
        </span>
      </div>
      <p
        className={`text-sm whitespace-pre-line wrap-break-word text-slate-300 ${full ? "" : "line-clamp-5"}`}
      >
        {review.text}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {!full && (
          <Link
            className="mr-auto"
            to={`/games/${review.gameId}/reviews/${review.id}`}
          >
            View review
          </Link>
        )}
        {own && !moderation && (
          <button
            className="button button-small button-ghost"
            onClick={() => setEditing(true)}
          >
            <Pencil size={13} aria-hidden="true" />
            Edit
          </button>
        )}
        {(own || auth.user?.role === "ADMIN") && (
          <button
            className="button button-small button-ghost text-rose-300"
            onClick={() => {
              mutation.reset();
              setDeleting(true);
            }}
          >
            <Trash2 size={13} aria-hidden="true" />
            Delete
          </button>
        )}
      </div>
      {editing && (
        <ReviewEditor
          gameId={review.gameId}
          review={review}
          onClose={() => setEditing(false)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete review?"
          confirmLabel="Delete review"
          pending={mutation.isPending}
          error={mutation.error}
          onConfirm={() => mutation.mutate()}
          onClose={() => setDeleting(false)}
        >
          <p>
            This will permanently remove{" "}
            {own ? "your" : `${review.author.displayName}’s`} review. This
            action cannot be undone.
          </p>
        </ConfirmDialog>
      )}
    </article>
  );
}

export function ReviewSection({ gameId }: { gameId: string }) {
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const reviews = useQuery({
    queryKey: ["reviews", gameId, { page }],
    queryFn: ({ signal }) =>
      api<Page<Review>>(`/games/${gameId}/reviews?page=${page}&pageSize=5`, {
        signal,
      }),
  });
  const mine = useQuery({
    queryKey: ["reviews", gameId, { authorId: auth.user?.id }],
    queryFn: ({ signal }) =>
      api<Page<Review>>(
        `/games/${gameId}/reviews?authorId=${auth.user!.id}&pageSize=1`,
        { signal },
      ),
    enabled: !!auth.user,
  });
  const ownReview = mine.data?.items[0];
  return (
    <section id="reviews" className="mt-12">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="mb-0">
          Player reviews{reviews.data ? ` (${reviews.data.total})` : ""}
        </h2>
        {auth.user && (
          <button
            className="button button-small"
            disabled={mine.isPending || mine.isError}
            onClick={() => setEditing(true)}
          >
            {ownReview ? (
              <Pencil size={15} aria-hidden="true" />
            ) : (
              <Plus size={15} aria-hidden="true" />
            )}
            {ownReview ? "Edit your review" : "Write a review"}
          </button>
        )}
      </div>
      {!auth.user && (
        <Notice kind="info">
          <Link to="/login" state={{ from: `/games/${gameId}` }}>
            Sign in
          </Link>{" "}
          to share your experience and rate this game.
        </Notice>
      )}
      {auth.user && mine.isError && (
        <Notice>
          Your review could not be loaded.{" "}
          <button className="text-button" onClick={() => void mine.refetch()}>
            Retry
          </button>
        </Notice>
      )}
      {reviews.isPending ? (
        <Loading label="Loading reviews…" />
      ) : reviews.isError ? (
        <ErrorState
          error={reviews.error}
          onRetry={() => void reviews.refetch()}
        />
      ) : (
        <>
          {reviews.data.items.length ? (
            <div className="grid gap-4">
              {reviews.data.items.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onDeleted={() => {
                    if (reviews.data.items.length === 1 && page > 1)
                      setPage(page - 1);
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No reviews yet">
              <p>Be the first to tell other players what you think.</p>
            </EmptyState>
          )}
          <Pagination
            label="Review pages"
            page={page}
            pageSize={5}
            total={reviews.data.total}
            busy={reviews.isFetching}
            onChange={setPage}
          />
        </>
      )}
      {editing && (
        <ReviewEditor
          gameId={gameId}
          review={ownReview}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  );
}

export function ReviewPage() {
  const { gameId = "", reviewId = "" } = useParams();
  const navigate = useNavigate();
  const game = useGame(gameId);
  const review = useQuery({
    queryKey: ["review", gameId, reviewId],
    queryFn: ({ signal }) =>
      api<Review>(`/games/${gameId}/reviews/${reviewId}`, { signal }),
  });
  if (review.isPending || game.isPending) return <Loading />;
  if (review.isError || game.isError)
    return (
      <ErrorState
        error={review.error ?? game.error}
        onRetry={() => {
          void review.refetch();
          void game.refetch();
        }}
      />
    );
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink to={`/games/${gameId}`}>Back to {game.data.title}</BackLink>
      <PageHeading title={`Review of ${game.data.title}`} />
      <ReviewCard
        review={review.data}
        full
        onDeleted={() => navigate(`/games/${gameId}`)}
      />
    </div>
  );
}
