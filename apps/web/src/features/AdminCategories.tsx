import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { invalidateCatalogue, pageNumber, useCategories } from "../lib/queries";
import { type Category } from "../lib/types";
import { AdminNavigation } from "../components/Layout";
import {
  ConfirmDialog,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  Loading,
  Notice,
  PageHeading,
  Pagination,
} from "../components/ui";

export function CategoryEditor({
  category,
  onClose,
}: {
  category?: Category;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: { name: string; description: string }) =>
      api<Category>(`/categories${category ? `/${category.id}` : ""}`, {
        method: category ? "PATCH" : "POST",
        auth: true,
        body,
      }),
    onSuccess: async () => {
      await invalidateCatalogue(client);
      onClose();
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!mutation.isPending)
      mutation.mutate({
        name: String(data.get("name") ?? "").trim(),
        description: String(data.get("description") ?? "").trim(),
      });
  }
  return (
    <Dialog
      title={category ? "Edit category" : "New category"}
      onClose={onClose}
      busy={mutation.isPending}
    >
      <form className="form-stack" onSubmit={submit}>
        {mutation.error && <Notice>{errorMessage(mutation.error)}</Notice>}
        <label>
          Name
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={category?.name}
            placeholder="e.g. Strategy"
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            required
            maxLength={2000}
            defaultValue={category?.description}
            placeholder="What kind of games belong here?"
            rows={4}
          />
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
          <button className="button" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save category"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function AdminCategories() {
  const categories = useCategories();
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const page = pageNumber(params.get("page"));
  const [editor, setEditor] = useState<{ category?: Category } | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: (id: string) =>
      api<void>(`/categories/${id}`, { method: "DELETE", auth: true }),
    onSuccess: async () => {
      await invalidateCatalogue(client);
      setDeleting(null);
      setParams({});
      setMessage("Category deleted.");
    },
  });
  const items = categories.data?.slice((page - 1) * 10, page * 10) ?? [];
  return (
    <>
      <AdminNavigation />
      <PageHeading
        title="Categories"
        eyebrow="Administration"
        description="Organise games into clear, useful categories."
      >
        <button className="button" onClick={() => setEditor({})}>
          <Plus size={17} aria-hidden="true" />
          New category
        </button>
      </PageHeading>
      {message && <Notice kind="success">{message}</Notice>}
      {categories.isPending ? (
        <Loading />
      ) : categories.isError ? (
        <ErrorState
          error={categories.error}
          onRetry={() => void categories.refetch()}
        />
      ) : (
        <>
          {items.length ? (
            <DataTable label="Categories">
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Description</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((category) => (
                  <tr key={category.id}>
                    <td className="min-w-40 font-semibold">
                      <Link to={`/categories/${category.id}`}>
                        {category.name}
                      </Link>
                    </td>
                    <td>
                      <p className="mb-0 min-w-48 max-w-md line-clamp-2 text-muted">
                        {category.description}
                      </p>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="button button-small button-ghost"
                          onClick={() => setEditor({ category })}
                          aria-label={`Edit ${category.name}`}
                        >
                          <Pencil size={13} aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          className="button button-small button-ghost text-rose-300"
                          onClick={() => {
                            mutation.reset();
                            setDeleting(category);
                          }}
                          aria-label={`Delete ${category.name}`}
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
            <EmptyState title="No categories on this page">
              <p>Create a category to start organising the catalogue.</p>
            </EmptyState>
          )}
          <Pagination
            page={page}
            pageSize={10}
            total={categories.data.length}
            onChange={(next) => setParams({ page: String(next) })}
          />
        </>
      )}
      {editor && (
        <CategoryEditor
          key={editor.category?.id ?? "new"}
          category={editor.category}
          onClose={() => setEditor(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          confirmLabel="Delete category"
          pending={mutation.isPending}
          error={mutation.error}
          onConfirm={() => mutation.mutate(deleting.id)}
          onClose={() => setDeleting(null)}
        >
          <p>
            This action cannot be undone. Move all games to another category
            before deleting this one.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
