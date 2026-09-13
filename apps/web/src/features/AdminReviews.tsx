import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { MessageSquare } from "lucide-react";
import { api, withQuery } from "../lib/api";
import { pageNumber, useGame, useGames, usePageUrl } from "../lib/queries";
import { type Page, type Review } from "../lib/types";
import { AdminNavigation } from "../components/Layout";
import {
  BackLink,
  EmptyState,
  ErrorState,
  Loading,
  PageHeading,
  Pagination,
  Rating,
} from "../components/ui";
import { SearchFilters } from "./catalogue";
import { ReviewCard } from "./reviews";

function GamePicker() {
  const [params, setParams] = useSearchParams();
  const page = pageNumber(params.get("page"));
  const search = params.get("search") ?? "";
  const categoryId = params.get("categoryId") ?? "";
  const games = useGames({ page, pageSize: 8, search, categoryId });
  function searchFor(search: string, categoryId: string) {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    if (categoryId) next.set("categoryId", categoryId);
    setParams(next);
  }
  if (games.isPending) return <Loading />;
  if (games.isError)
    return (
      <ErrorState error={games.error} onRetry={() => void games.refetch()} />
    );
  return (
    <>
      <SearchFilters
        key={params.toString()}
        search={search}
        categoryId={categoryId}
        onSearch={searchFor}
      />
      {games.data.items.length === 0 && (
        <EmptyState title="No games found">
          <p>Try a different search.</p>
        </EmptyState>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {games.data.items.map((game) => (
          <article className="panel flex flex-col items-start" key={game.id}>
            <h2 className="text-lg">{game.title}</h2>
            <div className="mb-4">
              <Rating value={game.averageRating} count={game.reviewCount} />
            </div>
            <button
              className="button button-small button-ghost mt-auto"
              onClick={() => setParams({ gameId: String(game.id) })}
            >
              <MessageSquare size={15} aria-hidden="true" />
              Manage reviews
            </button>
          </article>
        ))}
      </div>
      <Pagination
        page={page}
        pageSize={8}
        total={games.data.total}
        links={games.data._links}
        busy={games.isFetching}
        onChange={(next, href) => {
          games.followPage(href);
          const updated = new URLSearchParams(params);
          updated.set("page", String(next));
          setParams(updated);
        }}
      />
    </>
  );
}

function GameReviews({ gameId }: { gameId: number }) {
  const [params, setParams] = useSearchParams();
  const page = pageNumber(params.get("page"));
  const game = useGame(gameId);
  const navigation = usePageUrl(
    withQuery(`/games/${gameId}/reviews`, {
      page,
      pageSize: 10,
    }),
  );
  const reviews = useQuery({
    queryKey: ["reviews", gameId, { page, admin: true }],
    enabled: !!game.data,
    queryFn: ({ signal }) =>
      api<Page<Review>>(navigation.url, {
        signal,
      }),
  });
  function changePage(page: number) {
    setParams({ gameId: String(gameId), page: String(page) });
  }
  if (game.isPending) return <Loading />;
  if (game.isError)
    return (
      <ErrorState error={game.error} onRetry={() => void game.refetch()} />
    );
  if (reviews.isPending) return <Loading />;
  if (reviews.isError)
    return (
      <ErrorState
        error={reviews.error}
        onRetry={() => void reviews.refetch()}
      />
    );
  return (
    <>
      <BackLink to="/admin/reviews">Choose another game</BackLink>
      <h2>{game.data.title}</h2>
      {reviews.data.items.length === 0 && (
        <EmptyState title="No reviews to moderate">
          <p>This game has no reviews on this page.</p>
        </EmptyState>
      )}
      <div className="grid gap-4">
        {reviews.data.items.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            full
            moderation
            onDeleted={() => {
              if (reviews.data.items.length === 1 && page > 1)
                changePage(page - 1);
            }}
          />
        ))}
      </div>
      <Pagination
        page={page}
        pageSize={10}
        total={reviews.data.total}
        links={reviews.data._links}
        busy={reviews.isFetching}
        onChange={(next, href) => {
          navigation.followPage(href);
          changePage(next);
        }}
      />
    </>
  );
}

export function AdminReviews() {
  const [params] = useSearchParams();
  const gameId = params.get("gameId");
  return (
    <>
      <AdminNavigation />
      <PageHeading
        title="Review moderation"
        eyebrow="Administration"
        description="Read player feedback and remove inappropriate reviews."
      />
      {gameId ? <GameReviews gameId={Number(gameId)} /> : <GamePicker />}
    </>
  );
}
