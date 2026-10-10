import type { Database } from "@/integrations/supabase/types";

export type RequestStatus = Database["public"]["Enums"]["request_status"];
export type RequestPriority = Database["public"]["Enums"]["request_priority"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const STATUS: Record<RequestStatus, { label: string; badge: string; dot: string }> = {
  pendente: { label: "Pendente", badge: "bg-st-pendente/15 text-st-pendente", dot: "bg-st-pendente" },
  em_analise: { label: "Em análise", badge: "bg-st-em_analise/15 text-st-em_analise", dot: "bg-st-em_analise" },
  aprovada: { label: "Aprovada", badge: "bg-st-aprovada/15 text-st-aprovada", dot: "bg-st-aprovada" },
  em_compra: { label: "Em compra", badge: "bg-st-em_compra/15 text-st-em_compra", dot: "bg-st-em_compra" },
  comprado: { label: "Comprado", badge: "bg-st-comprado/15 text-st-comprado", dot: "bg-st-comprado" },
  parcial: { label: "Parcialmente comprado", badge: "bg-st-parcial/15 text-st-parcial", dot: "bg-st-parcial" },
  indisponivel: { label: "Não disponível", badge: "bg-st-indisponivel/15 text-st-indisponivel", dot: "bg-st-indisponivel" },
  cancelado: { label: "Cancelado", badge: "bg-st-cancelado/15 text-st-cancelado", dot: "bg-st-cancelado" },
};
export const STATUS_ORDER = Object.keys(STATUS) as RequestStatus[];

export const PRIORITY: Record<RequestPriority, { label: string; weight: number; badge: string }> = {
  baixa: { label: "Baixa", weight: 0, badge: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", weight: 1, badge: "bg-secondary text-secondary-foreground" },
  alta: { label: "Alta", weight: 2, badge: "bg-warning/20 text-accent-foreground" },
  urgente: { label: "Urgente", weight: 3, badge: "bg-destructive/15 text-destructive" },
};
export const PRIORITY_ORDER = Object.keys(PRIORITY) as RequestPriority[];

export const UNITS = ["Unidade", "Pacote", "Caixa", "Kit", "Kg", "Litro", "Outro"];

export const PENDING_STATUSES: RequestStatus[] = ["pendente", "em_analise", "aprovada", "em_compra", "parcial"];

export function formatDate(iso: string, withTime = false) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : { year: "numeric" }),
  });
}

export function formatBRL(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Valor total = quantidade comprada × valor unitário (null se faltar algum). */
export function calcTotal(qty: number | null | undefined, unit: number | null | undefined) {
  if (qty == null || unit == null || Number.isNaN(qty) || Number.isNaN(unit)) return null;
  return Math.round(qty * unit * 100) / 100;
}
