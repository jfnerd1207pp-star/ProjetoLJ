import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/lj";
import { claimAdmin } from "@/lib/admin.functions";

type AuthState = {
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  name: string;
  isStaff: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) {
      setRoles([]);
      setName("");
      return;
    }
    setTimeout(async () => {
      try { await claimAdmin(); } catch { /* ignore */ }
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("name").eq("id", uid).maybeSingle(),
      ]);
      setRoles((r ?? []).map((x) => x.role));
      setName(p?.name ?? "");
    }, 0);
  }, [uid]);

  const value: AuthState = {
    session,
    loading,
    roles,
    name,
    isStaff: roles.includes("compras") || roles.includes("admin"),
    isAdmin: roles.includes("admin"),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
