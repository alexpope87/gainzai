import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type ActionKey = "checkin" | "workout" | "macros" | "analysis";

const ACTIONS: Array<{
  key: ActionKey | "meal-plan";
  label: string;
  hint: string;
  to: string;
}> = [
  { key: "checkin", label: "Check", hint: "Peso, sonno, energia", to: "/checkin" },
  { key: "workout", label: "Log Allenamento", hint: "Serie, reps, kg, RIR", to: "/workout" },
  { key: "macros", label: "Macros", hint: "Inserisci i tuoi pasti", to: "/macros" },
  { key: "meal-plan", label: "Piano Alimentare", hint: "Gestisci il tuo piano pasti", to: "/meal-plan" },
  { key: "analysis", label: "Genera Analisi", hint: "Report AI 7 giorni", to: "/analysis" },
];

export function DashboardActions() {
  const navigate = useNavigate();

  const { data: done } = useQuery({
    queryKey: ["today-actions"],
    queryFn: async () => {
      const today = todayIso();
      const [checkin, workout, meals, analysis] = await Promise.all([
        supabase
          .from("checkins")
          .select("weight_kg, sleep_hours, energy")
          .eq("date", today)
          .limit(1),
        supabase.from("workout_sessions").select("id").eq("date", today).limit(1),
        supabase.from("meals").select("id, meal_type").eq("date", today),
        supabase.from("analyses").select("id").eq("date", today).limit(1),
      ]);

      const checkinRow = checkin.data?.[0];
      const hasCompleteCheckin =
        checkinRow != null &&
        checkinRow.weight_kg != null &&
        checkinRow.sleep_hours != null &&
        checkinRow.energy != null;

      const mealTypes = new Set((meals.data ?? []).map((m) => m.meal_type));
      const hasCompleteMacros =
        mealTypes.has("colazione") &&
        mealTypes.has("pranzo") &&
        mealTypes.has("cena");

      return {
        checkin: hasCompleteCheckin,
        workout: (workout.data?.length ?? 0) > 0,
        macros: hasCompleteMacros,
        analysis: (analysis.data?.length ?? 0) > 0,
      } as Record<ActionKey, boolean>;
    },
  });

  return (
    <section>
      <div className="flex flex-col gap-3">
        {ACTIONS.map((a) => {
          const isDone =
            a.key !== "meal-plan" ? (done?.[a.key] ?? false) : false;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => navigate({ to: a.to })}
              className={
                "relative flex min-h-[4.5rem] w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors " +
                (isDone
                  ? "border-[#00FF87] bg-secondary text-foreground hover:bg-secondary/80"
                  : "border-border bg-secondary text-foreground hover:bg-secondary/80")
              }
            >
              <span className="flex flex-col">
                <span className="text-sm font-semibold uppercase">{a.label}</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {isDone ? "Completato oggi" : a.hint}
                </span>
              </span>
              {isDone && (
                <span
                  className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                  style={{ color: "#00FF87" }}
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
