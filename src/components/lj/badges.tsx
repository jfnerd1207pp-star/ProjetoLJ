import { cn } from "@/lib/utils";
import { PRIORITY, STATUS, type RequestPriority, type RequestStatus } from "@/lib/lj";
import { Flame } from "lucide-react";

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", s.badge, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  const p = PRIORITY[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", p.badge)}>
      {priority === "urgente" && <Flame className="size-3" />}
      {p.label}
    </span>
  );
}
