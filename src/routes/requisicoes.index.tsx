import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/lj/AppShell";
import { RequestCard } from "@/components/lj/RequestCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/lj/states";
import { useAuth } from "@/lib/auth";
import { requestsQuery } from "@/lib/queries";

export const Route = createFileRoute("/requisicoes/")({
  head: () => ({
    meta: [
      { title: "Minhas requisições — LJ" },
      { name: "description", content: "Acompanhe o status dos seus pedidos." },
      { property: "og:title", content: "Minhas requisições — LJ" },
      { property: "og:description", content: "Acompanhe o status dos seus pedidos." },
    ],
  }),
  component: () => (
    <AppShell title="Minhas requisições">
      <Mine />
    </AppShell>
  ),
});

function Mine() {
  const { session } = useAuth();
  const { data, isLoading, error, refetch } = useQuery(requestsQuery("mine", session?.user.id));
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => refetch()} />;
  if (!data?.length) return <EmptyState />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data.map((r) => <RequestCard key={r.id} r={r} />)}
    </div>
  );
}
