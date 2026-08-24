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
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((a) => {
          const isDone = done?.[a.key] ?? false;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => navigate({ to: a.to })}
              className={
                "relative flex min-h-[5.5rem] flex-col items-start justify-between rounded-lg border p-4 text-left transition-colors " +
                (isDone
                  ? "border-[#00FF87] bg-secondary text-foreground hover:bg-secondary/80"
                  : "border-border bg-secondary text-foreground hover:bg-secondary/80")
              }
            >
              {isDone && (
                <span
                  className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                  style={{ color: "#00FF87" }}
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
              <span className="text-sm font-semibold">{a.label}</span>
              <span
                className={
                  "mt-2 text-xs " + (isDone ? "text-muted-foreground" : "text-muted-foreground")
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
