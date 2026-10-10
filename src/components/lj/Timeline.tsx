import { STATUS, formatDate, type RequestStatus } from "@/lib/lj";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  new_status: RequestStatus;
  old_status: RequestStatus | null;
  observation: string | null;
  created_at: string;
  profiles: { name: string } | null;
};

export function Timeline({ items }: { items: Item[] }) {
  return (
    <ol className="relative space-y-5 border-l-2 border-border pl-6">
      {items.map((h) => (
        <li key={h.id} className="relative">
          <span className={cn("absolute -left-[31px] top-1 size-4 rounded-full ring-4 ring-background", STATUS[h.new_status].dot)} />
          <p className="font-semibold">{h.old_status ? STATUS[h.new_status].label : "Solicitação criada"}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(h.created_at, true)} · {h.profiles?.name ?? "Sistema"}
          </p>
          {h.observation && h.old_status && (
            <p className="mt-1 rounded-xl bg-muted px-3 py-2 text-sm">{h.observation}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
