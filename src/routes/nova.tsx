import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/lj/AppShell";
import { ImageUploader } from "@/components/lj/ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { categoriesQuery, uploadRequestImages } from "@/lib/queries";
import { PRIORITY, PRIORITY_ORDER, UNITS, type RequestPriority } from "@/lib/lj";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nova")({
  head: () => ({
    meta: [
      { title: "Nova requisição — LJ" },
      { name: "description", content: "Peça um item para a ação social do LJ." },
      { property: "og:title", content: "Nova requisição — LJ" },
      { property: "og:description", content: "Peça um item para a ação social do LJ." },
    ],
  }),
  component: () => (
    <AppShell title="Nova requisição">
      <NewRequest />
    </AppShell>
  ),
});

const chip = (on: boolean) =>
  cn("rounded-xl border px-3 py-2.5 text-sm font-medium", on ? "border-primary bg-primary/10 text-primary" : "bg-card");

function NewRequest() {
  const { session } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: cats } = useQuery(categoriesQuery);
  const [step, setStep] = useState(0);
  const [item, setItem] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("Unidade");
  const [prio, setPrio] = useState<RequestPriority>("normal");
  const [files, setFiles] = useState<File[]>([]);
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  const steps = ["O que você precisa?", "Quanto precisa?", "Tem foto ou referência?", "Alguma observação?"];
  const canNext = step === 0 ? item.trim().length > 0 && !!cat : step === 1 ? Number(qty) > 0 : true;

  const submit = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("requests")
        .insert({
          item_name: item.trim().slice(0, 150),
          category_id: cat,
          quantity_requested: Number(qty),
          unit,
          priority: prio,
          observations: obs.trim().slice(0, 1000) || null,
          requester_id: session.user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (files.length) await uploadRequestImages(session.user.id, data.id, files);
      qc.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Requisição enviada!");
      nav({ to: "/requisicoes/$id", params: { id: data.id } });
    } catch {
      toast.error("Não foi possível enviar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
      <h2 className="text-xl font-bold">{steps[step]}</h2>

      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Item</Label>
            <Input className="h-12 rounded-xl" placeholder="Ex.: Escova de dentes infantil" value={item} onChange={(e) => setItem(e.target.value)} maxLength={150} />
          </div>
          <Label>Categoria</Label>
          <div className="grid grid-cols-2 gap-2">
            {cats?.map((c) => (
              <button key={c.id} type="button" className={chip(cat === c.id)} onClick={() => setCat(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Quantidade</Label>
            <Input type="number" min={1} inputMode="numeric" className="h-12 rounded-xl text-lg" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <Label>Unidade</Label>
          <div className="grid grid-cols-3 gap-2">
            {UNITS.map((u) => (
              <button key={u} type="button" className={chip(unit === u)} onClick={() => setUnit(u)}>{u}</button>
            ))}
          </div>
          <Label>Prioridade</Label>
          <div className="grid grid-cols-2 gap-2">
            {PRIORITY_ORDER.map((p) => (
              <button key={p} type="button" className={chip(prio === p)} onClick={() => setPrio(p)}>{PRIORITY[p].label}</button>
            ))}
          </div>
        </div>
      )}
      {step === 2 && <ImageUploader files={files} onChange={setFiles} />}
      {step === 3 && (
        <Textarea rows={5} className="rounded-xl" placeholder="Ex.: Preferencialmente com cerdas macias." value={obs} onChange={(e) => setObs(e.target.value)} maxLength={1000} />
      )}

      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <Button variant="outline" size="xl" className="flex-1" onClick={() => setStep(step - 1)}>Voltar</Button>
        )}
        {step < 3 ? (
          <Button size="xl" className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuar</Button>
        ) : (
          <Button size="xl" variant="hero" className="flex-1" disabled={busy} onClick={submit}>
            {busy ? "Enviando..." : "Enviar requisição"}
          </Button>
        )}
      </div>
    </div>
  );
}
