import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./AuthProvider";
import { api } from "../lib/api";
import { type User } from "../lib/types";
import { ErrorState, Loading, PageHeading } from "../components/ui";

export function AccountPage() {
  const { user } = useAuth();
  const account = useQuery({
    queryKey: ["private", user?.id, user?.role, "account"],
    queryFn: ({ signal }) =>
      api<User>(user!._links.self.href, { auth: true, signal }),
    enabled: !!user,
  });
  if (account.isPending) return <Loading label="Loading account…" />;
  if (account.isError)
    return (
      <ErrorState
        error={account.error}
        onRetry={() => void account.refetch()}
      />
    );
  return (
    <section className="mx-auto max-w-2xl">
      <PageHeading
        title="My account"
        description="Your current GameON identity and permissions."
      >
        <button
          className="button button-ghost"
          disabled={account.isFetching}
          onClick={() => void account.refetch()}
        >
          {account.isFetching ? "Refreshing…" : "Refresh details"}
        </button>
      </PageHeading>
      <dl className="panel grid gap-5 [&_dt]:text-sm [&_dt]:text-muted [&_dd]:wrap-anywhere">
        <div>
          <dt>Display name</dt>
          <dd>{account.data.displayName}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{account.data.email}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{account.data.role === "ADMIN" ? "Administrator" : "Member"}</dd>
        </div>
        <div>
          <dt>User ID</dt>
          <dd className="font-mono text-sm">{account.data.id}</dd>
        </div>
      </dl>
    </section>
  );
}
