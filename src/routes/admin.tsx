import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/lj/AppShell";
import { LoadingState } from "@/components/lj/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { STATUS, formatDate, type AppRole } from "@/lib/lj";
import { clearDemo, seedDemo } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo — LJ" },
      { name: "description", content: "Gerencie usuários, categorias, requisições e configurações do LJ." },
      { property: "og:title", content: "Painel administrativo — LJ" },
      { property: "og:description", content: "Gerencie usuários, categorias, requisições e configurações do LJ." },
    ],
  }),
  component: () => (
    <AppShell title="Painel administrativo" adminOnly>
      <Admin />
    </AppShell>
  ),
});

const ROLES: { v: AppRole; label: string }[] = [
  { v: "participante", label: "Participante" },
  { v: "compras", label: "Compras e Logística" },
  { v: "admin", label: "Administrador" },
];

async function logAction(action: string, details?: string) {
  await supabase.from("admin_actions").insert({ action, details: details ?? null });
}

function Admin() {
  return (
    <Tabs defaultValue="dash">
      <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
        <TabsTrigger value="dash">Dashboard</TabsTrigger>
        <TabsTrigger value="users">Usuários</TabsTrigger>
        <TabsTrigger value="cats">Categorias</TabsTrigger>
        <TabsTrigger value="reqs">Requisições</TabsTrigger>
        <TabsTrigger value="config">Configurações</TabsTrigger>
        <TabsTrigger value="log">Histórico</TabsTrigger>
      </TabsList>
      <TabsContent value="dash"><Dash /></TabsContent>
      <TabsContent value="users"><Users /></TabsContent>
      <TabsContent value="cats"><Cats /></TabsContent>
      <TabsContent value="reqs"><Reqs /></TabsContent>
      <TabsContent value="config"><Config /></TabsContent>
      <TabsContent value="log"><Log /></TabsContent>
    </Tabs>
  );
}

const card = "rounded-3xl border bg-card p-5";

function Dash() {
  const { data } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [u, r, c, p] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("requests").select("status"),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("purchases").select("total_price"),
      ]);
      return {
        users: u.count ?? 0,
        reqs: r.data ?? [],
        cats: c.count ?? 0,
        spent: (p.data ?? []).reduce((s, x) => s + Number(x.total_price ?? 0), 0),
      };
    },
  });
  if (!data) return <LoadingState />;
  const stats = [
    ["Usuários", data.users],
    ["Requisições", data.reqs.length],
    ["Categorias", data.cats],
    ["Gasto total", data.spent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([l, v]) => (
          <div key={l} className={card}>
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="font-display text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>
      <div className={card}>
        <p className="mb-3 font-semibold">Por status</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(STATUS).map(([k, s]) => (
            <div key={k} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
              <span>{s.label}</span>
              <b>{data.reqs.filter((r) => r.status === k).length}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Users() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const { data } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id,name,email,is_demo,created_at").order("created_at"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      return (p.data ?? []).map((u) => ({ ...u, roles: (r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role) }));
    },
  });
  const toggle = async (uid: string, name: string, role: AppRole, has: boolean) => {
    if (uid === session?.user.id && role === "admin" && has) return toast.error("Você não pode remover seu próprio acesso de admin.");
    const { error } = has
      ? await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error) return toast.error("Não foi possível alterar a função.");
    await logAction(has ? "Função removida" : "Função concedida", `${name}: ${role}`);
    qc.invalidateQueries({ queryKey: ["admin"] });
  };
  if (!data) return <LoadingState />;
  return (
    <div className="space-y-3">
      {data.map((u) => (
        <div key={u.id} className={card}>
          <p className="font-semibold">
            {u.name || "Sem nome"} {u.is_demo && <span className="ml-1 rounded-md bg-warning/20 px-1.5 text-xs">DEMO</span>}
          </p>
          <p className="text-sm text-muted-foreground">{u.email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ROLES.map((r) => {
              const has = u.roles.includes(r.v);
              return (
                <Button key={r.v} size="sm" variant={has ? "default" : "outline"} className="rounded-xl" onClick={() => toggle(u.id, u.name, r.v, has)}>
                  {r.label}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Cats() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data } = useQuery({
    queryKey: ["admin", "cats"],
    queryFn: async () => (await supabase.from("categories").select("id,name,active").order("name")).data ?? [],
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["categories"] }); };
  const add = async () => {
    if (name.trim().length < 2) return;
    const { error } = await supabase.from("categories").insert({ name: name.trim() });
    if (error) return toast.error("Erro ao criar categoria.");
    await logAction("Categoria criada", name.trim());
    setName("");
    refresh();
  };
  const toggle = async (id: string, n: string, active: boolean) => {
    await supabase.from("categories").update({ active: !active }).eq("id", id);
    await logAction(active ? "Categoria desativada" : "Categoria ativada", n);
    refresh();
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input className="h-11 rounded-xl" placeholder="Nova categoria" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <Button className="h-11 rounded-xl" onClick={add}>Adicionar</Button>
      </div>
      {data?.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
          <span className={c.active ? "" : "text-muted-foreground line-through"}>{c.name}</span>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toggle(c.id, c.name, c.active)}>
            {c.active ? "Desativar" : "Ativar"}
          </Button>
        </div>
      ))}
    </div>
  );
}

function Reqs() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "reqs"],
    queryFn: async () => (await supabase.from("requests").select("id,item_name,status,created_at,is_demo").order("created_at", { ascending: false })).data ?? [],
  });
  const del = async (id: string, n: string) => {
    if (!confirm(`Excluir "${n}"?`)) return;
    await supabase.from("purchases").delete().eq("request_id", id);
    const { error } = await supabase.from("requests").delete().eq("id", id);
    if (error) return toast.error("Não foi possível excluir (há histórico vinculado).");
    await logAction("Requisição excluída", n);
    qc.invalidateQueries();
  };
  if (!data) return <LoadingState />;
  return (
    <div className="space-y-2">
      {data.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-3">
          <Link to="/requisicoes/$id" params={{ id: r.id }} className="min-w-0">
            <p className="truncate font-medium">{r.item_name}</p>
            <p className="text-xs text-muted-foreground">{STATUS[r.status].label} · {formatDate(r.created_at)}</p>
          </Link>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => del(r.id, r.item_name)}>Excluir</Button>
        </div>
      ))}
    </div>
  );
}

function Config() {
  const qc = useQueryClient();
  const [eventName, setEventName] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => (await supabase.from("app_settings").select("value").eq("key", "general").maybeSingle()).data?.value as { event_name?: string; notice?: string } | undefined,
  });
  useEffect(() => { setEventName(data?.event_name ?? ""); setNotice(data?.notice ?? ""); }, [data]);
  const save = async () => {
    const { error } = await supabase.from("app_settings").upsert({ key: "general", value: { event_name: eventName, notice }, updated_at: new Date().toISOString() });
    if (error) return toast.error("Erro ao salvar.");
    await logAction("Configurações atualizadas");
    toast.success("Configurações salvas.");
  };
  const demo = async (kind: "seed" | "clear") => {
    if (kind === "clear" && !confirm("Remover todos os dados de demonstração?")) return;
    setBusy(true);
    try {
      const r = kind === "seed" ? await seedDemo() : await clearDemo();
      toast.success(`${kind === "seed" ? "Criados" : "Removidos"}: ${r.requests} requisições e ${r.users} usuários.`);
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.");
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <div className={`${card} space-y-3`}>
        <p className="font-semibold">Configurações básicas</p>
        <Input className="h-11 rounded-xl" placeholder="Nome da ação social" value={eventName} onChange={(e) => setEventName(e.target.value)} />
        <Textarea className="rounded-xl" placeholder="Aviso para os participantes" value={notice} onChange={(e) => setNotice(e.target.value)} />
        <Button className="rounded-xl" onClick={save}>Salvar</Button>
      </div>
      <div className={`${card} space-y-3`}>
        <p className="font-semibold">Dados de demonstração</p>
        <p className="text-sm text-muted-foreground">
          Cria usuários, requisições e compras fictícias marcadas como [DEMO]. Elas podem ser removidas a qualquer momento sem afetar os dados reais.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-xl" disabled={busy} onClick={() => demo("seed")}>Gerar dados de demonstração</Button>
          <Button variant="outline" className="rounded-xl" disabled={busy} onClick={() => demo("clear")}>Limpar dados de demonstração</Button>
        </div>
      </div>
    </div>
  );
}

function Log() {
  const { data } = useQuery({
    queryKey: ["admin", "log"],
    queryFn: async () => {
      const [a, h] = await Promise.all([
        supabase.from("admin_actions").select("id,action,details,created_at,actor_id").order("created_at", { ascending: false }).limit(100),
        supabase.from("request_history").select("id,new_status,observation,created_at,requests(item_name)").order("created_at", { ascending: false }).limit(100),
      ]);
      const items = [
        ...(a.data ?? []).map((x) => ({ id: x.id, at: x.created_at, text: x.action, sub: x.details })),
        ...(h.data ?? []).map((x) => ({ id: x.id, at: x.created_at, text: `${x.requests?.item_name ?? "Requisição"} → ${STATUS[x.new_status].label}`, sub: x.observation })),
      ];
      return items.sort((x, y) => y.at.localeCompare(x.at));
    },
  });
  if (!data) return <LoadingState />;
  return (
    <div className="space-y-2">
      {data.map((x) => (
        <div key={x.id} className="rounded-2xl border bg-card px-4 py-3">
          <p className="font-medium">{x.text}</p>
          <p className="text-xs text-muted-foreground">{formatDate(x.at, true)}{x.sub ? ` · ${x.sub}` : ""}</p>
        </div>
      ))}
    </div>
  );
}
