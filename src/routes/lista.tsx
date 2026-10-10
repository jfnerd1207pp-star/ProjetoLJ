import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/lj/AppShell";
import { StatusBadge } from "@/components/lj/badges";
import { EmptyState, LoadingState } from "@/components/lj/states";
import { requestsQuery } from "@/lib/queries";
import { PENDING_STATUSES, type RequestStatus } from "@/lib/lj";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lista")({
  head: () => ({
    meta: [
      { title: "Lista de compras — LJ" },
      { name: "description", content: "Central de acompanhamento dos itens da ação social." },
      { property: "og:title", content: "Lista de compras — LJ" },
      { property: "og:description", content: "Central de acompanhamento dos itens da ação social." },
    ],
  }),
  component: () => (
    <AppShell title="Lista de compras" staffOnly>
      <Lista />
    </AppShell>
  ),
});

const FILTERS: { label: string; match: (s: RequestStatus) => boolean }[] = [
  { label: "Todos", match: () => true },
  { label: "Pendentes", match: (s) => PENDING_STATUSES.includes(s) && s !== "em_compra" },
  { label: "Em compra", match: (s) => s === "em_compra" },
  { label: "Comprados", match: (s) => s === "comprado" },
  { label: "Não disponíveis", match: (s) => s === "indisponivel" },
];

function Lista() {
  const { data, isLoading } = useQuery(requestsQuery("visible"));
  const [f, setF] = useState(0);
  const list = (data ?? []).filter((r) => FILTERS[f].match(r.status));
  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((x, i) => (
          <button key={x.label} onClick={() => setF(i)} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-medium", f === i ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
            {x.label}
          </button>
        ))}
      </div>
      {isLoading ? <LoadingState /> : list.length === 0 ? <EmptyState showCreate={false} /> : (
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">
          {list.map((r) => (
            <Link key={r.id} to="/requisicoes/$id" params={{ id: r.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 hover:bg-muted/50">
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.item_name}</p>
                <p className="text-sm text-muted-foreground">{Number(r.quantity_requested)} {r.unit.toLowerCase()}</p>
              </div>
              <StatusBadge status={r.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
