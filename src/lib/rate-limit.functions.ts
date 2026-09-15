import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAiQuotas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getRateLimitUsage } = await import("./rate-limit.server");
    const [analysis, macros, program] = await Promise.all([
      getRateLimitUsage(context.userId, "analysis"),
      getRateLimitUsage(context.userId, "macros"),
      getRateLimitUsage(context.userId, "program"),
    ]);
    return { analysis, macros, program };
  });
