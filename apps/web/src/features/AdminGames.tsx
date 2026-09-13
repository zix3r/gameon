import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import {
  invalidateCatalogue,
  pageNumber,
  useCategories,
  useGames,
} from "../lib/queries";
import { type Game, type GameInput } from "../lib/types";
import { AdminNavigation } from "../components/Layout";
import {
  ConfirmDialog,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  GameCover,
  Loading,
  Notice,
  PageHeading,
  Pagination,
} from "../components/ui";
import { SearchFilters } from "./catalogue";

export function GameEditor({
  game,
  onClose,
}: {
  game?: Game;
  onClose: () => void;
}) {
  const categories = useCategories();
  const client = useQueryClient();
  const [categoryId, setCategoryId] = useState(game?.categoryId ?? "");
  const mutation = useMutation({
    mutationFn: (body: GameInput) =>
      api<Game>(game?._links.self.href ?? "/games", {
        method: game ? "PATCH" : "POST",
        auth: true,
        body,
      }),
    onSuccess: async () => {
      await invalidateCatalogue(client);
      await client.invalidateQueries({ queryKey: ["private"] });
      onClose();
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    if (!mutation.isPending)
      mutation.mutate({
        categoryId,
        title: value("title"),
        description: value("description"),
        platform: value("platform"),
        imageUrl: value("imageUrl") || null,
      });
  }
  return (
    <Dialog
      title={game ? "Edit game" : "New game"}
      onClose={onClose}
      busy={mutation.isPending}
    >
      <form className="form-stack" onSubmit={submit}>
        {mutation.error && <Notice>{errorMessage(mutation.error)}</Notice>}
        {categories.isError && (
          <Notice>
            Categories could not load.{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => void categories.refetch()}
            >
              Retry
            </button>
          </Notice>
        )}
        {categories.data?.length === 0 && (
          <Notice kind="info">Create a category before adding a game.</Notice>
        )}
        <label>
          Title
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={game?.title}
          />
        </label>
        <label>
          Category
          <select
            required
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={categories.isPending || categories.isError}
          >
            <option value="" disabled>
              {categories.isPending
                ? "Loading categories…"
                : "Choose a category"}
            </option>
            {categories.data?.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Platforms
          <input
            name="platform"
            required
            maxLength={100}
            defaultValue={game?.platform}
            placeholder="e.g. PC, PlayStation 5"
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            required
            maxLength={10000}
            defaultValue={game?.description}
            rows={6}
          />
        </label>
        <label>
          Cover URL
          <input
            name="imageUrl"
            type="url"
            maxLength={2048}
            defaultValue={game?.imageUrl ?? ""}
            placeholder="https://images.igdb.com/…"
          />
          <span className="field-hint">
            Optional HTTP(S) URL. Leave empty to use the cover placeholder.
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
            disabled={
              mutation.isPending || !categories.data?.length || !categoryId
            }
          >
            {mutation.isPending ? "Saving…" : "Save game"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function AdminGames() {
  const [params, setParams] = useSearchParams();
  const page = pageNumber(params.get("page"));
  const search = params.get("search") ?? "";
  const categoryId = params.get("categoryId") ?? "";
  const games = useGames({ page, pageSize: 10, search, categoryId });
  const categories = useCategories();
  const client = useQueryClient();
  const [editor, setEditor] = useState<{ game?: Game } | null>(null);
  const [deleting, setDeleting] = useState<Game | null>(null);
  const [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: (href: string) =>
      api<void>(href, { method: "DELETE", auth: true }),
    onSuccess: async () => {
      await invalidateCatalogue(client);
      setDeleting(null);
      const updated = new URLSearchParams(params);
      updated.delete("page");
      setParams(updated);
      setMessage("Game deleted.");
    },
  });
  return (
    <>
      <AdminNavigation />
      <PageHeading
        title="Games"
        eyebrow="Administration"
        description="Manage game details, covers, and categories."
      >
        <button className="button" onClick={() => setEditor({})}>
          <Plus size={17} aria-hidden="true" />
          New game
        </button>
      </PageHeading>
      {message && <Notice kind="success">{message}</Notice>}
      <SearchFilters
        key={params.toString()}
        search={search}
        categoryId={categoryId}
        onSearch={(value, category) =>
          setParams({
            ...(value ? { search: value } : {}),
            ...(category ? { categoryId: category } : {}),
          })
        }
      />
      {games.isPending ? (
        <Loading />
      ) : games.isError ? (
        <ErrorState error={games.error} onRetry={() => void games.refetch()} />
      ) : (
        <>
          {games.data.items.length ? (
            <DataTable label="Games">
              <thead>
                <tr>
                  <th scope="col">Game</th>
                  <th scope="col">Category</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.data.items.map((game) => (
                  <tr key={game.id}>
                    <td>
                      <div className="flex min-w-52 items-center gap-3">
                        <GameCover
                          game={game}
                          className="h-14 w-10 shrink-0 rounded-md [&_span]:hidden [&_svg]:size-5"
                        />
                        <div>
                          <Link
                            className="font-semibold"
                            to={`/games/${game.id}`}
                          >
                            {game.title}
                          </Link>
                          <span className="block text-xs text-muted">
                            {game.platform}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">
                      {categories.data?.find(
                        (category) => category.id === game.categoryId,
                      )?.name ?? "—"}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="button button-small button-ghost"
                          onClick={() => setEditor({ game })}
                          aria-label={`Edit ${game.title}`}
                        >
                          <Pencil size={13} aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          className="button button-small button-ghost text-rose-300"
                          onClick={() => {
                            mutation.reset();
                            setDeleting(game);
                          }}
                          aria-label={`Delete ${game.title}`}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState title="No games found">
              <p>Try changing the filters, or add a new game.</p>
            </EmptyState>
          )}
          <Pagination
            page={page}
            pageSize={10}
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
      )}
      {editor && (
        <GameEditor
          key={editor.game?.id ?? "new"}
          game={editor.game}
          onClose={() => setEditor(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.title}?`}
          confirmLabel="Delete game"
          pending={mutation.isPending}
          error={mutation.error}
          onConfirm={() => mutation.mutate(deleting._links.self.href)}
          onClose={() => setDeleting(null)}
        >
          <p>
            This permanently removes the game. Reviews must be removed first.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
