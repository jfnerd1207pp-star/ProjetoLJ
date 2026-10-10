import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, ClipboardList, Clock, Search, CheckCircle2, ShoppingBag, Hourglass } from "lucide-react";
import { AppShell } from "@/components/lj/AppShell";
import { RequestCard } from "@/components/lj/RequestCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/lj/states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { requestsQuery } from "@/lib/queries";
import { PENDING_STATUSES } from "@/lib/lj";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — LJ Laboratório Juventude" },
      { name: "description", content: "Acompanhe as requisições e compras da ação social do LJ." },
      { property: "og:title", content: "Painel — LJ Laboratório Juventude" },
      { property: "og:description", content: "Acompanhe as requisições e compras da ação social do LJ." },
    ],
  }),
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});

function Dashboard() {
  const { name, isStaff } = useAuth();
  const { data, isLoading, error, refetch } = useQuery(requestsQuery("visible"));
  const list = data ?? [];
  const count = (f: (s: string) => boolean) => list.filter((r) => f(r.status)).length;

  const stats = [
    { label: "Total", value: list.length, icon: ClipboardList, tone: "bg-secondary text-secondary-foreground" },
    { label: "Pendentes", value: count((s) => s === "pendente"), icon: Clock, tone: "bg-st-pendente/15 text-st-pendente" },
    { label: "Em análise", value: count((s) => s === "em_analise"), icon: Search, tone: "bg-st-em_analise/15 text-st-em_analise" },
    { label: "Aprovadas", value: count((s) => s === "aprovada"), icon: CheckCircle2, tone: "bg-st-aprovada/15 text-st-aprovada" },
    { label: "Comprados", value: count((s) => s === "comprado"), icon: ShoppingBag, tone: "bg-st-comprado/15 text-st-comprado" },
    { label: "Ainda pendentes", value: count((s) => PENDING_STATUSES.includes(s as never)), icon: Hourglass, tone: "bg-accent text-accent-foreground" },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-pop">
        <p className="text-sm text-primary-foreground/80">Olá{name ? `, ${name.split(" ")[0]}` : ""} 👋</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">
          {isStaff ? "Vamos organizar as compras?" : "Do que seu grupo precisa?"}
        </h1>
        <Button asChild size="xl" variant="secondary" className="mt-5 bg-background text-foreground hover:bg-background/90">
          <Link to="/nova">
            <Plus /> Nova requisição
          </Link>
        </Button>
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary-foreground/10" />
      </section>

      {error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-4 shadow-soft">
              <div className={cn("mb-3 grid size-9 place-items-center rounded-xl", s.tone)}>
                <s.icon className="size-5" />
              </div>
              <p className="font-display text-3xl font-bold">{isLoading ? "–" : s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Requisições recentes</h2>
          <Link to={isStaff ? "/compras" : "/requisicoes"} className="text-sm font-semibold text-primary">
            Ver todas
          </Link>
        </div>
        {isLoading ? (
          <LoadingState />
        ) : list.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {list.slice(0, 6).map((r) => (
              <RequestCard key={r.id} r={r} showRequester={isStaff} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
