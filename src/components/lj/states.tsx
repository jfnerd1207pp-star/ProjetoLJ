import { Link } from "@tanstack/react-router";
import { PackageOpen, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EmptyState({
  title = "Nenhuma requisição encontrada.",
  description,
  showCreate = true,
}: {
  title?: string;
  description?: string;
  showCreate?: boolean;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed bg-card px-6 py-12 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <PackageOpen className="size-7" />
      </div>
      <p className="font-display text-lg font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
      {showCreate && (
        <Button asChild size="xl" className="mt-6">
          <Link to="/nova">
            <Plus /> Criar primeira requisição
          </Link>
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border bg-card px-6 py-10 text-center">
      <AlertTriangle className="mb-3 size-8 text-destructive" />
      <p className="font-semibold">Ops, algo deu errado.</p>
      <p className="mt-1 text-sm text-muted-foreground">{message ?? "Não foi possível carregar os dados."}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}
