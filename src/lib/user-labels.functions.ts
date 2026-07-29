import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Resolve e-mails (rótulos) de usuários a partir dos IDs de auditoria. */
export const getUserLabels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ids: string[] }) => ({
    ids: Array.from(new Set((data?.ids ?? []).filter((id) => typeof id === "string" && id.length > 0))).slice(0, 50),
  }))
  .handler(async ({ data }) => {
    if (data.ids.length === 0) return {} as Record<string, string>;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out: Record<string, string> = {};
    for (const id of data.ids) {
      const { data: res } = await supabaseAdmin.auth.admin.getUserById(id);
      const user = res?.user;
      if (!user) continue;
      const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
      out[id] = user.email ?? meta.full_name ?? meta.name ?? id;
    }
    return out;
  });