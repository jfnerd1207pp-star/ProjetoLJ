import { Link } from "@tanstack/react-router";
import { ChevronRight, User } from "lucide-react";
import type { RequestRow } from "@/lib/queries";
import { formatDate } from "@/lib/lj";
import { PriorityBadge, StatusBadge } from "./badges";

export function RequestCard({ r, showRequester }: { r: RequestRow; showRequester?: boolean }) {
  return (
    <Link
      to="/requisicoes/$id"
      params={{ id: r.id }}
      className="group block rounded-2xl border bg-card p-4 shadow-soft transition active:scale-[0.99] hover:border-primary/40"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold">{r.item_name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {Number(r.quantity_requested)} {r.unit.toLowerCase()} · {r.categories?.name ?? "Sem categoria"}
          </p>
        </div>
        <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={r.status} />
        <PriorityBadge priority={r.priority} />
        <span className="ml-auto flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          {showRequester && (
            <>
              <User className="size-3 shrink-0" />
              <span className="truncate">{r.profiles?.name}</span> ·
            </>
          )}
          {formatDate(r.created_at)}
        </span>
      </div>
    </Link>
  );
}
