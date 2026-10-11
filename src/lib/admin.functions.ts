import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin({ supabase, userId }: Ctx) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Acesso restrito ao administrador.");
}

/** Concede admin se o e-mail do usuário estiver na variável de ambiente ADMIN_EMAILS. */
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = String((context.claims as any).email ?? "").toLowerCase();
    const allowed = (process.env["ADMIN_EMAILS"] ?? "jfnerd1207.pp@gmail.com")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!email || !allowed.includes(email)) return { granted: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    return { granted: true };
  });

const DEMO_PEOPLE = ["Ana (Demo)", "Bruno (Demo)", "Carla (Demo)"];
const DEMO_ITEMS = [
  ["Brinquedos educativos", "alta", "pendente", 20],
  ["Bolas de futebol", "normal", "em_analise", 10],
  ["Kits de higiene", "urgente", "aprovada", 50],
  ["Cestas básicas", "urgente", "em_compra", 30],
  ["Pacotes de bala", "baixa", "comprado", 15],
  ["Copos descartáveis", "normal", "parcial", 200],
  ["Fantasias infantis", "baixa", "indisponivel", 8],
  ["Balões coloridos", "normal", "cancelado", 5],
  ["Cadernos", "alta", "pendente", 40],
  ["Lápis de cor", "normal", "comprado", 40],
] as const;

export const seedDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const tag = Math.random().toString(36).slice(2, 7);
    const ids: string[] = [];
    for (const [i, name] of DEMO_PEOPLE.entries()) {
      const { data, error } = await db.auth.admin.createUser({
        email: `demo${i + 1}-${tag}@demo.lj.local`,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { name },
      });
      if (error || !data.user) throw new Error("Falha ao criar usuário demo.");
      ids.push(data.user.id);
    }
    await db.from("profiles").update({ is_demo: true }).in("id", ids);
    const { data: cats } = await db.from("categories").select("id");
    const rows = DEMO_ITEMS.map(([item, priority, status, qty], i) => ({
      item_name: `[DEMO] ${item}`,
      priority,
      status,
      quantity_requested: qty,
      unit: "Unidade",
      requester_id: ids[i % ids.length]!,
      category_id: cats?.length ? cats[i % cats.length]!.id : null,
      observations: "Dado fictício de demonstração.",
      is_demo: true,
    }));
    const { data: reqs, error } = await db.from("requests").insert(rows).select("id,status,quantity_requested");
    if (error) throw new Error(error.message);
    const purchases = (reqs ?? [])
      .filter((r) => r.status === "comprado" || r.status === "parcial")
      .map((r) => {
        const q = r.status === "parcial" ? Math.ceil(Number(r.quantity_requested) / 2) : Number(r.quantity_requested);
        return { request_id: r.id, quantity_purchased: q, unit_price: 2.5, total_price: q * 2.5, purchase_location: "Loja Demo", observations: "Compra fictícia", purchased_by: context.userId };
      });
    if (purchases.length) await db.from("purchases").insert(purchases);
    await db.from("admin_actions").insert({ actor_id: context.userId, action: "Dados de demonstração criados", details: `${rows.length} requisições, ${ids.length} usuários` });
    return { requests: rows.length, users: ids.length };
  });

export const clearDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: reqs } = await db.from("requests").select("id").eq("is_demo", true);
    const rids = (reqs ?? []).map((r) => r.id);
    if (rids.length) {
      await db.from("purchases").delete().in("request_id", rids);
      await db.from("request_history").delete().in("request_id", rids);
      await db.from("request_images").delete().in("request_id", rids);
      await db.from("requests").delete().in("id", rids);
    }
    const { data: users } = await db.from("profiles").select("id").eq("is_demo", true);
    for (const u of users ?? []) await db.auth.admin.deleteUser(u.id);
    await db.from("admin_actions").insert({ actor_id: context.userId, action: "Dados de demonstração removidos", details: `${rids.length} requisições` });
    return { requests: rids.length, users: users?.length ?? 0 };
  });
