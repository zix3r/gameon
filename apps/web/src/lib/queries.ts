import { QueryClient, keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "./api";
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
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search) query.set("search", search);
  if (categoryId) query.set("categoryId", categoryId);
  return useQuery({
    queryKey: ["games", query.toString()],
    queryFn: ({ signal }) => api<Page<Game>>(`/games?${query}`, { signal }),
    placeholderData: keepPreviousData,
  });
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
  for (let page = 2; (page - 1) * 100 < first.total; page++) {
    items.push(
      ...(
        await api<Page<Category>>(`/categories?pageSize=100&page=${page}`, {
          signal,
        })
      ).items,
    );
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
