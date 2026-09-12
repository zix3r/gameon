import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  ArrowUpRight,
  FolderTree,
  Gamepad2,
  MessageSquare,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../lib/api";
import { useCategories, useGames } from "../lib/queries";
import { type Order, type Page } from "../lib/types";
import { AdminNavigation } from "../components/Layout";
import { Notice, PageHeading } from "../components/ui";

export function AdminOverview() {
  const { user } = useAuth();
  const games = useGames({ pageSize: 1 });
  const categories = useCategories();
  const orders = useQuery({
    queryKey: ["private", user?.id, user?.role, "order-count"],
    queryFn: ({ signal }) =>
      api<Page<Order>>("/orders?pageSize=1", { auth: true, signal }),
  });
  const stats = [
    {
      label: "Games",
      value: games.data?.total,
      error: games.isError,
      retry: games.refetch,
      to: "/admin/games",
    },
    {
      label: "Categories",
      value: categories.data?.length,
      error: categories.isError,
      retry: categories.refetch,
      to: "/admin/categories",
    },
    {
      label: "Demo orders",
      value: orders.data?.total,
      error: orders.isError,
      retry: orders.refetch,
      to: "/admin/orders",
    },
  ];
  const sections = [
    {
      title: "Categories",
      description: "Create and organise the catalogue’s categories.",
      icon: FolderTree,
      to: "/admin/categories",
    },
    {
      title: "Games",
      description: "Manage titles, descriptions, covers, and prices.",
      icon: Gamepad2,
      to: "/admin/games",
    },
    {
      title: "Review moderation",
      description: "Read player feedback and remove inappropriate reviews.",
      icon: MessageSquare,
      to: "/admin/reviews",
    },
    {
      title: "All orders",
      description: "Inspect demonstration purchases across all accounts.",
      icon: ShoppingBag,
      to: "/admin/orders",
    },
  ];
  return (
    <>
      <AdminNavigation />
      <PageHeading
        title="Administration"
        eyebrow="GameON management"
        description="Keep the catalogue fresh and the community welcoming."
      >
        <Link className="button button-ghost" to="/games">
          View catalogue
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </PageHeading>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div className="panel" key={stat.label}>
            {stat.error ? (
              <Notice>
                Unavailable.{" "}
                <button
                  className="text-button"
                  onClick={() => void stat.retry()}
                >
                  Retry
                </button>
              </Notice>
            ) : (
              <strong className="mb-2 block text-4xl">
                {stat.value ?? "…"}
              </strong>
            )}
            <Link className="text-sm text-muted" to={stat.to}>
              {stat.label}
            </Link>
          </div>
        ))}
      </div>
      <section className="mt-10">
        <h2>Manage GameON</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {sections.map(({ title, description, icon: Icon, to }) => (
            <Link
              className="panel group text-ink hover:border-violet-400/60"
              to={to}
              key={to}
            >
              <div className="mb-4 flex items-center justify-between">
                <Icon className="text-accent" aria-hidden="true" />
                <ArrowUpRight
                  className="size-5 text-muted group-hover:text-accent"
                  aria-hidden="true"
                />
              </div>
              <h3>{title}</h3>
              <p className="mb-0 text-sm text-muted">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
