import { Link, useParams } from "react-router";
import { Monitor } from "lucide-react";
import { useCategories, useGame } from "../lib/queries";
import {
  BackLink,
  ErrorState,
  GameCover,
  Loading,
  PageHeading,
  Rating,
} from "../components/ui";
import { ReviewSection } from "./reviews";

export function GamePage() {
  const { gameId = "" } = useParams();
  const game = useGame(gameId);
  const categories = useCategories();
  if (game.isPending) return <Loading label="Loading game…" />;
  if (game.isError)
    return (
      <ErrorState error={game.error} onRetry={() => void game.refetch()} />
    );
  const category = categories.data?.find(
    (item) => item.id === game.data.categoryId,
  );
  return (
    <>
      <BackLink to="/games">Back to the catalogue</BackLink>
      <div className="grid items-start gap-8 sm:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
        <GameCover
          game={game.data}
          eager
          className="mx-auto w-full max-w-60 rounded-2xl border border-line sm:max-w-none"
        />
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Link
              className="rounded-md bg-violet-950 px-3 py-1 text-xs font-semibold"
              to={`/categories/${game.data.categoryId}`}
            >
              {category?.name ?? "View category"}
            </Link>
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Monitor size={14} aria-hidden="true" />
              {game.data.platform}
            </span>
            <a href="#reviews">
              <Rating
                value={game.data.averageRating}
                count={game.data.reviewCount}
              />
            </a>
          </div>
          <PageHeading title={game.data.title} />
          <p className="leading-loose whitespace-pre-line wrap-break-word text-slate-300">
            {game.data.description}
          </p>
        </div>
      </div>
      <ReviewSection
        key={`${game.data.categoryId}:${gameId}`}
        gameId={gameId}
        reviewsHref={game.data._links.reviews.href}
      />
    </>
  );
}
