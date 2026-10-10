import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/lj/AppShell";
import { PriorityBadge, StatusBadge } from "@/components/lj/badges";
import { Timeline } from "@/components/lj/Timeline";
import { ErrorState, LoadingState } from "@/components/lj/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { requestDetailQuery } from "@/lib/queries";
import { STATUS, STATUS_ORDER, calcTotal, formatBRL, formatDate, type RequestStatus } from "@/lib/lj";

export const Route = createFileRoute("/requisicoes/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da requisição — LJ" },
      { name: "description", content: "Status, fotos e histórico da requisição." },
      { property: "og:title", content: "Detalhes da requisição — LJ" },
      { property: "og:description", content: "Status, fotos e histórico da requisição." },
    ],
  }),
  component: () => (
    <AppShell>
      <Detail />
    </AppShell>
  ),
});

function Detail() {
  const { id } = Route.useParams();
  const { session, isStaff } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(requestDetailQuery(id));
  const [status, setStatus] = useState<RequestStatus | "">("");
  const [note, setNote] = useState("");
  const [p, setP] = useState({ qty: "", price: "", place: "", obs: "" });

  if (isLoading) return <LoadingState />;
  if (error || !data?.request) return <ErrorState message="Requisição não encontrada." onRetry={() => refetch()} />;
  const r = data.request;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["request", id] });
    qc.invalidateQueries({ queryKey: ["requests"] });
  };

  const changeStatus = async (s: RequestStatus, n?: string) => {
    const { error } = await supabase.rpc("change_request_status", { _request_id: id, _status: s, _note: n ?? undefined });
    if (error) return toast.error("Não foi possível alterar o status.");
    toast.success(`Status: ${STATUS[s].label}`);
    setNote("");
    setStatus("");
    refresh();
  };

  const savePurchase = async () => {
    const qty = Number(p.qty);
    if (!(qty >= 0) || !p.qty) return toast.error("Informe a quantidade comprada.");
    const price = p.price ? Number(p.price.replace(",", ".")) : null;
    const { error } = await supabase.from("purchases").insert({
      request_id: id,
      quantity_purchased: qty,
      unit_price: price,
      total_price: calcTotal(qty, price),
      purchase_location: p.place || null,
      observations: p.obs || null,
      purchased_by: session!.user.id,
    });
    if (error) return toast.error("Erro ao registrar compra.");
    const next: RequestStatus = qty >= Number(r.quantity_requested) ? "comprado" : "parcial";
    await changeStatus(next, `Comprado: ${qty} ${r.unit.toLowerCase()}`);
    setP({ qty: "", price: "", place: "", obs: "" });
  };

  const isOwnerPending = r.requester_id === session?.user.id && r.status === "pendente";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-3xl border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={r.status} />
          <PriorityBadge priority={r.priority} />
        </div>
        <h1 className="mt-3 text-2xl font-bold">{r.item_name}</h1>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Info k="Quantidade" v={`${Number(r.quantity_requested)} ${r.unit}`} />
          <Info k="Categoria" v={r.categories?.name ?? "—"} />
          <Info k="Solicitante" v={r.profiles?.name ?? "—"} />
          <Info k="Data" v={formatDate(r.created_at, true)} />
        </dl>
        {r.observations && <p className="mt-4 rounded-xl bg-muted p-3 text-sm">{r.observations}</p>}
        {data.images.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {data.images.map((img) => (
              <a key={img.id} href={img.url} target="_blank" rel="noreferrer">
                <img src={img.url} alt={r.item_name} className="aspect-square w-full rounded-xl border object-cover" />
              </a>
            ))}
          </div>
        )}
        {isOwnerPending && (
          <Button variant="outline" className="mt-4 w-full" onClick={() => confirm("Cancelar esta requisição?") && changeStatus("cancelado")}>
            Cancelar requisição
          </Button>
        )}
      </div>

      {isStaff && (
        <div className="space-y-3 rounded-3xl border bg-card p-5 shadow-soft">
          <h2 className="text-lg font-bold">Alterar status</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.filter((s) => s !== r.status).map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${STATUS[s].badge} ${status === s ? "ring-2 ring-ring" : ""}`}>
                {STATUS[s].label}
              </button>
            ))}
          </div>
          {status && (
            <>
              <Textarea placeholder="Observação (opcional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
              <Button size="xl" className="w-full" onClick={() => confirm(`Mudar para "${STATUS[status].label}"?`) && changeStatus(status, note)}>
                Confirmar
              </Button>
            </>
          )}
        </div>
      )}

      {isStaff && (
        <div className="space-y-3 rounded-3xl border bg-card p-5 shadow-soft">
          <h2 className="text-lg font-bold">Registrar compra</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Qtd. comprada</Label><Input type="number" inputMode="decimal" value={p.qty} onChange={(e) => setP({ ...p, qty: e.target.value })} /></div>
            <div className="space-y-1"><Label>Valor unitário (R$)</Label><Input inputMode="decimal" value={p.price} onChange={(e) => setP({ ...p, price: e.target.value })} /></div>
          </div>
          <p className="text-sm text-muted-foreground">Total: <b>{formatBRL(calcTotal(Number(p.qty), p.price ? Number(p.price.replace(",", ".")) : null))}</b></p>
          <Input placeholder="Local da compra" value={p.place} onChange={(e) => setP({ ...p, place: e.target.value })} />
          <Textarea placeholder="Observação da compra" value={p.obs} onChange={(e) => setP({ ...p, obs: e.target.value })} />
          <Button size="xl" className="w-full" onClick={savePurchase}>Salvar compra</Button>
          {data.purchases.map((c) => (
            <div key={c.id} className="rounded-xl bg-muted p-3 text-sm">
              <b>{Number(c.quantity_purchased)}</b> · {formatBRL(c.total_price)} · {c.purchase_location ?? "—"}
              <p className="text-xs text-muted-foreground">{formatDate(c.purchased_at, true)} · {c.profiles?.name}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-3xl border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-bold">Histórico</h2>
        <Timeline items={data.history} />
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
