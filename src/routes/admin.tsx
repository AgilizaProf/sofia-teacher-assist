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
      await supabase.from("activity_events").insert({
        event_type: "admin_acesso_negado",
        route: "/admin",
        user_id: null,
        metadata: { motivo: "sem_sessao" },
      });
      throw redirect({ to: "/auth" });
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) {
      await supabase.from("activity_events").insert({
        event_type: "admin_acesso_negado",
        route: "/admin",
        user_id: user.id,
        metadata: { motivo: "sem_permissao" },
      });
      throw redirect({ to: "/" });
    }
  },
  component: () => <Outlet />,
});
