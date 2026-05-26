import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      await supabase.from("logs_acesso_admin").insert({
        rota: "/admin",
        user_id: null,
        motivo: "sem_sessao",
        created_at: new Date().toISOString(),
      }).then(() => {});
      throw redirect({ to: "/auth" });
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) {
      await supabase.from("logs_acesso_admin").insert({
        rota: "/admin",
        user_id: user.id,
        motivo: "sem_permissao",
        created_at: new Date().toISOString(),
      }).then(() => {});
      throw redirect({ to: "/" });
    }
  },
  component: () => <Outlet />,
});
