import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/lj/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeartHandshake } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — LJ Laboratório Juventude" },
      { name: "description", content: "Acesse o sistema de requisições e compras do LJ." },
      { property: "og:title", content: "Entrar — LJ Laboratório Juventude" },
      { property: "og:description", content: "Acesse o sistema de requisições e compras do LJ." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/" });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("E-mail ou senha incorretos.");
      } else {
        if (name.trim().length < 2) throw new Error("Informe seu nome.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    // O broker de OAuth do Lovable (/~oauth) só existe nos domínios do Lovable;
    // fora deles (ex.: Netlify) usamos o OAuth do Supabase diretamente.
    const onLovable = /(^|\.)lovable\.(app|dev)$/.test(window.location.hostname);
    if (onLovable) {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (r.error) toast.error("Não foi possível entrar com Google.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("Não foi possível entrar com Google.");
  };

  return (
    <div className="min-h-screen md:grid md:grid-cols-2">
      <div className="relative flex flex-col justify-between overflow-hidden bg-hero px-6 pb-14 pt-8 md:p-12">
        <Logo light />
        <div className="mt-12 md:mt-0">
          <HeartHandshake className="mb-4 size-10 text-primary-foreground/90" />
          <h1 className="font-display text-3xl font-extrabold leading-tight text-primary-foreground md:text-5xl">
            Cada item pedido
            <br />é um sorriso garantido.
          </h1>
          <p className="mt-3 max-w-sm text-primary-foreground/85">
            Requisições, compras e logística da ação social da turma 307 — Senac.
          </p>
        </div>
        <div className="pointer-events-none absolute -bottom-24 -right-20 size-72 rounded-full bg-primary-foreground/10" />
      </div>

      <div className="-mt-6 rounded-t-3xl bg-background px-6 pb-10 pt-8 md:mt-0 md:flex md:items-center md:justify-center md:rounded-none">
        <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-bold">{mode === "in" ? "Entrar" : "Criar conta"}</h2>
          {mode === "up" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" className="h-12 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required className="h-12 rounded-xl" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required minLength={6} className="h-12 rounded-xl" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" size="xl" variant="hero" className="w-full" disabled={busy}>
            {busy ? "Aguarde..." : mode === "in" ? "Entrar" : "Criar conta"}
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" size="xl" className="w-full" onClick={google}>
            Continuar com Google
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "in" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
            <button type="button" className="font-semibold text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
