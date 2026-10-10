import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/lj/AppShell";
import { RequestCard } from "@/components/lj/RequestCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/lj/states";
import { Input } from "@/components/ui/input";
import { categoriesQuery, requestsQuery } from "@/lib/queries";
import { PRIORITY, PRIORITY_ORDER, STATUS, STATUS_ORDER } from "@/lib/lj";

export const Route = createFileRoute("/compras")({
  head: () => ({
    meta: [
      { title: "Compras e Logística — LJ" },
      { name: "description", content: "Todas as requisições com filtros para a equipe de compras." },
      { property: "og:title", content: "Compras e Logística — LJ" },
      { property: "og:description", content: "Todas as requisições com filtros para a equipe de compras." },
    ],
  }),
  component: () => (
    <AppShell title="Compras e Logística" staffOnly>
      <Compras />
    </AppShell>
  ),
});

const sel = "h-11 rounded-xl border bg-card px-3 text-sm";

function Compras() {
  const { data, isLoading, error, refetch } = useQuery(requestsQuery("visible"));
  const { data: cats } = useQuery(categoriesQuery);
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const [cat, setCat] = useState("");
  const [pr, setPr] = useState("");
  const [sort, setSort] = useState("date");

  const list = useMemo(() => {
    const out = (data ?? []).filter(
      (r) =>
        (!q || r.item_name.toLowerCase().includes(q.toLowerCase())) &&
        (!st || r.status === st) &&
        (!cat || r.category_id === cat) &&
        (!pr || r.priority === pr),
    );
    if (sort === "prio") out.sort((a, b) => PRIORITY[b.priority].weight - PRIORITY[a.priority].weight);
    return out;
  }, [data, q, st, cat, pr, sort]);

  return (
    <div className="space-y-4">
      <Input placeholder="Pesquisar item..." className="h-12 rounded-xl" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select className={sel} value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">Todos status</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </select>
        <select className={sel} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas categorias</option>
          {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={sel} value={pr} onChange={(e) => setPr(e.target.value)}>
          <option value="">Toda prioridade</option>
          {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
        </select>
        <select className={sel} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="date">Mais recentes</option>
          <option value="prio">Maior prioridade</option>
        </select>
      </div>
      {isLoading ? <LoadingState /> : error ? <ErrorState onRetry={() => refetch()} /> : list.length === 0 ? (
        <EmptyState showCreate={false} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((r) => <RequestCard key={r.id} r={r} showRequester />)}
        </div>
      )}
    </div>
  );
}
