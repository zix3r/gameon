import { QueryClient, keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, apiUrl, withQuery } from "./api";
import { useState } from "react";

export function usePageUrl(path: string) {
  const parsed = new URL(apiUrl(path), "https://gameon.invalid");
  const page = parsed.searchParams.get("page") ?? "1";
  parsed.searchParams.delete("page");
  parsed.searchParams.sort();
  const scope = parsed.pathname + parsed.search;
  const [selected, setSelected] = useState<{
    scope: string;
    page: string;
    href: string;
  }>();
  return {
    url:
      selected?.scope === scope && selected.page === page
        ? selected.href
        : path,
    followPage: (href?: string) => {
      if (!href) return;
      const target = new URL(apiUrl(href), "https://gameon.invalid");
      setSelected({
        scope,
        page: target.searchParams.get("page") ?? "1",
        href: apiUrl(href),
      });
    },
  };
}
import { type Category, type Game, type Page } from "./types";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: false,
    },
    mutations: { retry: false },
  },
});

export function useGames({
  page = 1,
  pageSize = 12,
  search = "",
  categoryId = "",
  href = "/games",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  href?: string;
} = {}) {
  const path = withQuery(href, {
    page,
    pageSize,
    search: search || undefined,
    categoryId: categoryId || undefined,
  });
  const navigation = usePageUrl(path);
  const result = useQuery({
    queryKey: ["games", apiUrl(path)],
    queryFn: ({ signal }) => api<Page<Game>>(navigation.url, { signal }),
    placeholderData: keepPreviousData,
  });
  return { ...result, followPage: navigation.followPage };
}

export function useGame(id: string) {
  return useQuery({
    queryKey: ["game", id],
    queryFn: ({ signal }) => api<Game>(`/games/${id}`, { signal }),
    enabled: !!id,
  });
}

async function allCategories(signal: AbortSignal): Promise<Category[]> {
  const first = await api<Page<Category>>("/categories?pageSize=100", {
    signal,
  });
  const items = [...first.items];
  let next = first._links.next;
  while (next) {
    const result = await api<Page<Category>>(next.href, { signal });
    items.push(...result.items);
    next = result._links.next;
  }
  return items;
}

export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => allCategories(signal),
  });

export async function invalidateCatalogue(client: QueryClient) {
  await Promise.all(
    ["categories", "category", "games", "game"].map((key) =>
      client.invalidateQueries({ queryKey: [key] }),
    ),
  );
}

export async function invalidateReviews(client: QueryClient, gameId: string) {
  await Promise.all([
    client.invalidateQueries({ queryKey: ["reviews", gameId] }),
    client.invalidateQueries({ queryKey: ["review", gameId] }),
    client.invalidateQueries({ queryKey: ["game", gameId] }),
    client.invalidateQueries({ queryKey: ["games"] }),
  ]);
}

export function pageNumber(value: string | null) {
  const number = Number(value ?? 1);
  return Number.isInteger(number) && number >= 1 && number <= 1000000
    ? number
    : 1;
}

export const money = (value: string, currency = "EUR") =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(
    Number(value),
  );
export const date = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    new Date(value),
  );
