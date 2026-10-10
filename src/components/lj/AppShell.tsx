import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Home, ListChecks, LogOut, Plus, ShoppingCart, ClipboardList } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LoadingState } from "./states";

export function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-hero font-display text-lg font-extrabold text-primary-foreground shadow-pop">
        LJ
      </div>
      <div className="min-w-0 leading-tight">
        <p className={light ? "font-display font-bold text-primary-foreground" : "font-display font-bold"}>LJ</p>
        <p className={light ? "truncate text-xs text-primary-foreground/80" : "truncate text-xs text-muted-foreground"}>
          Laboratório Juventude
        </p>
      </div>
    </div>
  );
}

export function AppShell({ children, title, staffOnly }: { children: ReactNode; title?: string; staffOnly?: boolean }) {
  const { session, loading, isStaff, roles, name, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <LoadingState />
      </div>
    );
  }

  const navItems = [
    { to: "/", label: "Início", icon: Home },
    { to: "/requisicoes", label: "Minhas", icon: ClipboardList },
    ...(isStaff
      ? [
          { to: "/compras", label: "Compras", icon: ShoppingCart },
          { to: "/lista", label: "Lista", icon: ListChecks },
        ]
      : []),
  ] as const;

  return (
    <div className="min-h-screen pb-safe md:pb-10">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: true }}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                  activeProps={{ className: "bg-muted text-foreground" }}
                >
                  {n.label}
                </Link>
              ))}
              <Button asChild className="ml-2 rounded-xl">
                <Link to="/nova">
                  <Plus /> Nova requisição
                </Link>
              </Button>
            </nav>
            <Button variant="ghost" size="icon" aria-label="Sair" onClick={() => signOut()}>
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-5">
        {title && (
          <div className="mb-5">
            <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          </div>
        )}
        {staffOnly && roles.length > 0 && !isStaff ? (
          <div className="rounded-3xl border bg-card p-8 text-center">
            <p className="font-semibold">Área restrita à equipe de Compras e Logística.</p>
            <p className="mt-1 text-sm text-muted-foreground">Olá, {name}! Peça ao administrador para liberar seu acesso.</p>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Navegação inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden">
        <div className="relative mx-auto flex max-w-md items-end justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
          {navItems.slice(0, 2).map((n) => (
            <NavBtn key={n.to} {...n} />
          ))}
          <Link
            to="/nova"
            aria-label="Nova requisição"
            className="-mt-8 grid size-16 place-items-center rounded-full bg-hero text-primary-foreground shadow-pop ring-4 ring-background"
          >
            <Plus className="size-8" />
          </Link>
          {navItems.slice(2).map((n) => (
            <NavBtn key={n.to} {...n} />
          ))}
          {navItems.length === 2 && <div className="w-16" />}
        </div>
      </nav>
    </div>
  );
}

function NavBtn({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className="flex w-16 flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-medium text-muted-foreground"
      activeProps={{ className: "text-primary" }}
    >
      <Icon className="size-6" />
      {label}
    </Link>
  );
}
