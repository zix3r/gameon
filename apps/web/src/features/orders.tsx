import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { api, errorMessage } from "../lib/api";
import { date, money, pageNumber } from "../lib/queries";
import { type Game, type Order, type Page } from "../lib/types";
import {
  BackLink,
  Dialog,
  EmptyState,
  ErrorState,
  Loading,
  Notice,
  PageHeading,
  Pagination,
} from "../components/ui";
import { AdminNavigation } from "../components/Layout";

export function OrderDialog({
  game,
  onClose,
}: {
  game: Game;
  onClose: () => void;
}) {
  const auth = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      api<Order>("/orders", {
        method: "POST",
        auth: true,
        body: { gameId: game.id },
      }),
    onSuccess: (order) => {
      void client.invalidateQueries({ queryKey: ["private", auth.user?.id] });
      onClose();
      navigate(`/orders/${order.id}`, { state: { created: true } });
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (confirmed && !mutation.isPending) mutation.mutate();
  }
  return (
    <Dialog
      title="Confirm your demo order"
      onClose={onClose}
      busy={mutation.isPending}
    >
      <form className="form-stack" onSubmit={submit}>
        <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-page p-4">
          <div>
            <strong>{game.title}</strong>
            <span className="block text-sm text-muted">{game.platform}</span>
          </div>
          <strong className="whitespace-nowrap">{money(game.price)}</strong>
        </div>
        <Notice kind="info">
          This is a demonstration only. You will not be charged, and no game key
          or download will be delivered.
        </Notice>
        {mutation.error && <Notice>{errorMessage(mutation.error)}</Notice>}
        <label className="flex-row items-start gap-3 font-normal">
          <input
            className="mt-1"
            type="checkbox"
            required
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            I understand that this is a demo order with no real payment.
          </span>
        </label>
        <span className="field-hint">
          The current catalogue price is recorded when the order is placed.
        </span>
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
            disabled={!confirmed || mutation.isPending}
          >
            {mutation.isPending ? "Placing order…" : "Place demo order"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function OrdersPage({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = pageNumber(params.get("page"));
  const userId = admin ? (params.get("userId") ?? "") : (user?.id ?? "");
  const query = new URLSearchParams({
    page: String(page),
    pageSize: "9",
    ...(userId ? { userId } : {}),
  });
  const orders = useQuery({
    queryKey: [
      "private",
      user?.id,
      user?.role,
      "orders",
      { page, userId, admin },
    ],
    queryFn: ({ signal }) =>
      api<Page<Order>>(`/orders?${query}`, { auth: true, signal }),
    enabled: !!user,
  });
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(
      new FormData(event.currentTarget).get("userId") ?? "",
    ).trim();
    setParams(value ? { userId: value } : {});
  }
  return (
    <>
      {admin && <AdminNavigation />}
      <PageHeading
        title={admin ? "All orders" : "My orders"}
        eyebrow={admin ? "Administration" : "Your collection"}
        description={
          admin
            ? "Review demonstration orders across all accounts."
            : "Your demonstration purchases, all in one place."
        }
      />
      {admin && (
        <form
          key={userId}
          className="mb-6 flex flex-wrap items-end gap-3"
          onSubmit={filter}
        >
          <label className="min-w-52 flex-1">
            Filter by user ID
            <input
              name="userId"
              defaultValue={userId}
              placeholder="User UUID, or leave empty for everyone"
              pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
            />
          </label>
          <button className="button">Apply filter</button>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => setParams({})}
          >
            Reset
          </button>
        </form>
      )}
      {orders.isPending ? (
        <Loading label="Loading orders…" />
      ) : orders.isError ? (
        <ErrorState
          error={orders.error}
          onRetry={() => void orders.refetch()}
        />
      ) : (
        <>
          {orders.data.items.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orders.data.items.map((order) => (
                <article className="panel flex flex-col gap-3" key={order.id}>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted">
                    <span>#{order.id.slice(0, 8).toUpperCase()}</span>
                    <time dateTime={order.createdAt}>
                      {date(order.createdAt)}
                    </time>
                  </div>
                  <h2 className="mb-0 text-lg">
                    <Link to={`/games/${order.gameId}`}>
                      {order.game.title}
                    </Link>
                  </h2>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950 px-2 py-1 text-xs text-emerald-200">
                      <CheckCircle2 size={13} aria-hidden="true" />
                      Demo order
                    </span>
                    <strong>
                      {money(order.unitPriceAtPurchase, order.currency)}
                    </strong>
                  </div>
                  {admin && (
                    <p className="mb-0 text-xs break-all text-muted">
                      User: {order.userId}
                    </p>
                  )}
                  <Link
                    className="button button-small button-ghost mt-auto self-start"
                    to={`/orders/${order.id}`}
                    state={{ fromAdmin: admin }}
                  >
                    View order
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                admin ? "No matching orders" : "Your collection starts here"
              }
            >
              <p>
                {admin
                  ? "Try another user ID, or remove the filter."
                  : "Find a game you like and try placing a demo order."}
              </p>
              <Link className="button" to="/games">
                <ShoppingBag size={16} aria-hidden="true" />
                Browse games
              </Link>
            </EmptyState>
          )}
          <Pagination
            page={page}
            pageSize={9}
            total={orders.data.total}
            busy={orders.isFetching}
            label="Order pages"
            onChange={(next) => {
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

export function OrderPage() {
  const { orderId = "" } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const order = useQuery({
    queryKey: ["private", user?.id, user?.role, "order", orderId],
    queryFn: ({ signal }) =>
      api<Order>(`/orders/${orderId}`, { auth: true, signal }),
    enabled: !!user,
  });
  const fromAdmin =
    user?.role === "ADMIN" && Boolean(location.state?.fromAdmin);
  if (order.isPending) return <Loading />;
  if (order.isError)
    return (
      <ErrorState error={order.error} onRetry={() => void order.refetch()} />
    );
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink to={fromAdmin ? "/admin/orders" : "/orders"}>
        Back to orders
      </BackLink>
      <PageHeading
        title="Order details"
        eyebrow={`Order #${order.data.id.slice(0, 8).toUpperCase()}`}
      />
      {location.state?.created && (
        <Notice kind="success">Your demo order was placed successfully.</Notice>
      )}
      <div className="panel">
        <dl className="divide-y divide-line [&>div]:grid [&>div]:gap-2 [&>div]:py-4 sm:[&>div]:grid-cols-[150px_1fr] [&_dt]:text-sm [&_dt]:text-muted [&_dd]:wrap-anywhere">
          <div>
            <dt>Game</dt>
            <dd>
              <Link to={`/games/${order.data.gameId}`}>
                {order.data.game.title}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Order ID</dt>
            <dd className="font-mono text-sm">{order.data.id}</dd>
          </div>
          <div>
            <dt>Placed on</dt>
            <dd>{date(order.data.createdAt)}</dd>
          </div>
          <div>
            <dt>Recorded price</dt>
            <dd className="text-xl font-bold">
              {money(order.data.unitPriceAtPurchase, order.data.currency)}
            </dd>
          </div>
          {user?.role === "ADMIN" && (
            <div>
              <dt>User ID</dt>
              <dd className="font-mono text-sm">{order.data.userId}</dd>
            </div>
          )}
          <div>
            <dt>Status</dt>
            <dd>Demonstration completed</dd>
          </div>
        </dl>
      </div>
      <div className="mt-6">
        <Notice kind="info">
          No payment was taken. This university project does not deliver game
          keys or downloads.
        </Notice>
      </div>
    </div>
  );
}
