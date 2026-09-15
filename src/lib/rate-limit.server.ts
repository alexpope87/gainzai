export const RATE_LIMITS = {
  analysis: { limit: 1, message: "Hai già generato l'analisi di oggi. Torna domani." },
  macros: { limit: 20, message: "Hai raggiunto il limite di stime macro per oggi." },
  program: { limit: 3, message: "Hai raggiunto il limite di caricamento schede per oggi." },
} as const;

export type RateLimitEndpoint = keyof typeof RATE_LIMITS;

/** Consuma una chiamata per l'utente. Lancia un errore se il limite giornaliero (UTC) è superato. */
export async function consumeRateLimit(userId: string, endpoint: RateLimitEndpoint) {
  const { limit, message } = RATE_LIMITS[endpoint];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
    _user_id: userId,
    _endpoint: endpoint,
    _limit: limit,
  });
  if (error) {
    console.error("rate limit check failed", endpoint, error);
    throw new Error("Impossibile verificare il limite di utilizzo. Riprova.");
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.allowed) throw new Error(message);
  return { remaining: row.remaining as number, limit };
}

export async function getRateLimitUsage(userId: string, endpoint: RateLimitEndpoint) {
  const { limit } = RATE_LIMITS[endpoint];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("get_rate_limit_usage", {
    _user_id: userId,
    _endpoint: endpoint,
  });
  const used = error ? 0 : Number(data ?? 0);
  return { used, limit, remaining: Math.max(limit - used, 0) };
}
