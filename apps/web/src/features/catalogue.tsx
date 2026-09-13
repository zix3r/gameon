import { useEffect, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowRight, Gamepad2, Search } from "lucide-react";
import { api } from "../lib/api";
import { money, pageNumber, useCategories, useGames } from "../lib/queries";
import { type Category, type Game } from "../lib/types";
import {
  BackLink,
  EmptyState,
  ErrorState,
  GameCover,
  Loading,
  Notice,
  PageHeading,
  Pagination,
  Rating,
} from "../components/ui";

export function GameGrid({ games }: { games: Game[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {games.map((game) => (
        <article
          key={game.id}
          className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-violet-400/60"
        >
          <Link
            className="flex h-full flex-col text-ink hover:text-white"
            to={`/games/${game.id}`}
          >
            <GameCover game={game} />
            <div className="flex flex-1 flex-col p-3 sm:p-4">
              <span className="text-[11px] font-medium tracking-wide text-muted uppercase">
                {game.platform}
              </span>
              <h3 className="mt-1 mb-4 text-sm sm:text-base">{game.title}</h3>
              <div className="mt-auto flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <Rating value={game.averageRating} count={game.reviewCount} />
                <strong className="text-sm">{money(game.price)}</strong>
              </div>
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}

export function HomePage() {
  const games = useGames({ pageSize: 8 });
  const categories = useCategories();
  useEffect(() => {
    document.title = "GameON · Find your next favourite";
  }, []);
  return (
    <>
      <section className="grid items-center gap-10 overflow-hidden rounded-3xl border border-violet-400/25 bg-linear-to-br from-surface to-violet-950/60 p-6 sm:p-10 lg:grid-cols-2 lg:p-14">
        <div>
          <span className="eyebrow">Play something great</span>
          <h1 className="max-w-[13ch] text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
            Your next <span className="text-accent">favourite</span> starts
            here.
          </h1>
          <p className="mt-5 max-w-md text-muted">
            Discover great games, share honest reviews, and explore a collection
            built for curious players.
          </p>
          <Link to="/games" className="button mt-2">
            Explore the catalogue
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <p className="mt-4 mb-0 text-xs text-muted">
            A university project for discovering and reviewing games.
          </p>
        </div>
        <div
          className="mx-auto flex w-full max-w-md items-center gap-3 py-6"
          aria-label="Featured games"
        >
          {games.isPending ? (
            <Loading label="Finding your next game…" />
          ) : games.data?.items.length ? (
            games.data.items.slice(0, 3).map((game, index) => (
              <Link
                key={game.id}
                to={`/games/${game.id}`}
                className={`w-1/3 rounded-xl shadow-2xl ${index === 0 ? "-rotate-8 translate-y-4" : index === 2 ? "rotate-8 translate-y-4" : "-translate-y-4"}`}
              >
                <GameCover game={game} eager className="rounded-xl" />
              </Link>
            ))
          ) : (
            <Gamepad2
              className="mx-auto size-40 text-violet-400/40"
              aria-hidden="true"
            />
          )}
        </div>
      </section>
      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="mb-0">Find your kind of game</h2>
        </div>
        {categories.isError ? (
          <Notice>
            Categories are unavailable.{" "}
            <button
              className="text-button"
              onClick={() => void categories.refetch()}
            >
              Retry
            </button>
          </Notice>
        ) : (
          <div className="flex flex-wrap gap-3">
            {categories.data?.map((category) => (
              <Link
                className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-slate-200 hover:border-accent"
                to={`/categories/${category.id}`}
                key={category.id}
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="mt-12">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="mb-0">Recently added</h2>
          <Link className="inline-flex items-center gap-1 text-sm" to="/games">
            View all
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {games.isPending ? (
          <Loading />
        ) : games.isError ? (
          <ErrorState
            error={games.error}
            onRetry={() => void games.refetch()}
          />
        ) : games.data.items.length ? (
          <GameGrid games={games.data.items} />
        ) : (
          <EmptyState title="The catalogue is on its way">
            <p>No games have been added yet. Check back soon.</p>
          </EmptyState>
        )}
      </section>
    </>
  );
}

export function SearchFilters({
  search,
  categoryId = "",
  fixedCategory = false,
  onSearch,
}: {
  search: string;
  categoryId?: string;
  fixedCategory?: boolean;
  onSearch: (search: string, categoryId: string) => void;
}) {
  const categories = useCategories();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSearch(
      String(data.get("search") ?? "").trim(),
      fixedCategory ? categoryId : String(data.get("categoryId") ?? ""),
    );
  }
  return (
    <>
      <form
        className="mb-4 flex flex-wrap items-end gap-4 rounded-2xl border border-line bg-surface p-5"
        onSubmit={submit}
      >
        <label className="min-w-44 flex-1">
          Search games
          <input
            type="search"
            name="search"
            maxLength={200}
            defaultValue={search}
            placeholder="Try Portal, Hades, or Stardew…"
          />
        </label>
        {!fixedCategory && (
          <label className="w-full sm:w-52">
            Category
            <select
              name="categoryId"
              defaultValue={categoryId}
              disabled={categories.isPending || categories.isError}
            >
              <option value="">All categories</option>
              {categories.data?.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="button flex-1 sm:flex-none">
          <Search size={16} aria-hidden="true" />
          Search
        </button>
        <button
          type="button"
          className="button button-ghost flex-1 sm:flex-none"
          onClick={() => onSearch("", fixedCategory ? categoryId : "")}
        >
          Reset
        </button>
      </form>
      {categories.isError && (
        <Notice>
          Category filters could not load.{" "}
          <button
            className="text-button"
            onClick={() => void categories.refetch()}
          >
            Retry
          </button>
        </Notice>
      )}
    </>
  );
}

export function CataloguePage({
  fixedCategory = "",
}: {
  fixedCategory?: string;
}) {
  const [params, setParams] = useSearchParams();
  const page = pageNumber(params.get("page"));
  const search = params.get("search") ?? "";
  const categoryId = fixedCategory || params.get("categoryId") || "";
  const category = useQuery({
    queryKey: ["category", fixedCategory],
    queryFn: ({ signal }) =>
      api<Category>(`/categories/${fixedCategory}`, { signal }),
    enabled: !!fixedCategory,
  });
  const games = useGames({
    page,
    search,
    categoryId,
    href: category.data?._links.games.href,
  });
  if (fixedCategory && category.isPending) return <Loading />;
  if (fixedCategory && category.isError)
    return (
      <ErrorState
        error={category.error}
        onRetry={() => void category.refetch()}
      />
    );
  function searchFor(value: string, category: string) {
    setParams({
      ...(value ? { search: value } : {}),
      ...(!fixedCategory && category ? { categoryId: category } : {}),
    });
  }
  return (
    <>
      {fixedCategory && <BackLink to="/games">All games</BackLink>}
      <PageHeading
        title={category.data?.name ?? "Discover games"}
        eyebrow={fixedCategory ? "Browse by category" : "The GameON collection"}
        description={
          category.data?.description ??
          "Find something worth playing. Explore the catalogue and hear what other players think."
        }
      />
      <SearchFilters
        key={params.toString() + fixedCategory}
        search={search}
        categoryId={categoryId}
        fixedCategory={!!fixedCategory}
        onSearch={searchFor}
      />
      {games.isPending ? (
        <Loading label="Loading games…" />
      ) : games.isError ? (
        <ErrorState error={games.error} onRetry={() => void games.refetch()} />
      ) : (
        <>
          <p className="mb-5 text-sm text-muted" aria-live="polite">
            {games.data.total} {games.data.total === 1 ? "game" : "games"} found
            {games.isFetching ? " · Updating…" : ""}
          </p>
          {games.data.items.length ? (
            <GameGrid games={games.data.items} />
          ) : (
            <EmptyState title="No games found">
              <p>Try another title or category.</p>
              <button
                className="button button-ghost"
                onClick={() => searchFor("", fixedCategory)}
              >
                Clear filters
              </button>
            </EmptyState>
          )}
          <Pagination
            page={page}
            pageSize={12}
            total={games.data.total}
            links={games.data._links}
            busy={games.isFetching}
            label="Game pages"
            onChange={(next, href) => {
              games.followPage(href);
              const updated = new URLSearchParams(params);
              updated.set("page", String(next));
              setParams(updated);
            }}
          />
        </>
      )}
    </>
  );
}

export function CategoryPage() {
  const { categoryId = "" } = useParams();
  return <CataloguePage fixedCategory={categoryId} />;
}
