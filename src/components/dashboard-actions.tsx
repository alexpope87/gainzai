import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type ActionKey = "checkin" | "workout" | "macros" | "analysis";

const ACTIONS: Array<{ key: ActionKey; label: string; hint: string; to: string }> = [
  { key: "checkin", label: "Check", hint: "Peso, sonno, energia", to: "/checkin" },
  { key: "workout", label: "Log Allenamento", hint: "Serie, reps, kg, RIR", to: "/workout" },
  { key: "macros", label: "Macros", hint: "Inserisci i tuoi pasti", to: "/macros" },
  { key: "analysis", label: "Genera analisi", hint: "Report AI 7 giorni", to: "/analysis" },
];

export function DashboardActions() {
  const navigate = useNavigate();

  const { data: done } = useQuery({
    queryKey: ["today-actions"],
    queryFn: async () => {
      const today = todayIso();
      const [checkin, workout, meals, analysis] = await Promise.all([
        supabase.from("checkins").select("id").eq("date", today).limit(1),
        supabase.from("workout_sessions").select("id").eq("date", today).limit(1),
        supabase.from("meals").select("id").eq("date", today).limit(1),
        supabase.from("analyses").select("id").eq("date", today).limit(1),
      ]);
      return {
        checkin: (checkin.data?.length ?? 0) > 0,
        workout: (workout.data?.length ?? 0) > 0,
        macros: (meals.data?.length ?? 0) > 0,
        analysis: (analysis.data?.length ?? 0) > 0,
      } as Record<ActionKey, boolean>;
    },
  });

  return (
    <section>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACTIONS.map((a) => {
          const isDone = done?.[a.key] ?? false;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => navigate({ to: a.to })}
              className={
                "flex min-h-28 flex-col items-start justify-between border p-5 text-left transition-colors " +
                (isDone
                  ? "border-[#00FF87] bg-[#00FF87] text-black hover:bg-[#00FF87]/90"
                  : "border-border bg-secondary text-foreground hover:bg-secondary/80")
              }
            >
              <span className="text-base font-semibold">{a.label}</span>
              <span
                className={
                  "mt-3 text-xs " + (isDone ? "text-black/70" : "text-muted-foreground")
                }
              >
                {isDone ? "Completato oggi" : a.hint}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
