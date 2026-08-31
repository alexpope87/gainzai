import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  target_kcal: number | null;
  target_protein_g: number | null;
  weight_kg: number | null;
};

const MUSCLE_GROUPS = ["Spalle", "Schiena", "Petto", "Braccia", "Gambe", "Altro"] as const;
type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

const GROUP_COLORS: Record<MuscleGroup, string> = {
  Schiena: "#3B82F6",
  Petto: "#00FF87",
  Braccia: "#F97316",
  Gambe: "#A855F7",
  Spalle: "#EF4444",
  Altro: "#9CA3AF",
};

const GROUP_KEYWORDS: Array<[MuscleGroup, string[]]> = [
  ["Spalle", ["spalle", "alzate", "military", "lento", "shoulder", "deltoid", "arnold", "press dietro"]],
  ["Schiena", ["schiena", "trazioni", "pulley", "rematore", "lat", "pull", "row", "stacchi", "deadlift", "pullover"]],
  ["Petto", ["petto", "panca", "croci", "chest", "bench", "dip", "spinte piane", "pectoral"]],
  ["Braccia", ["curl", "bicip", "tricip", "french", "push down", "pushdown", "hammer", "martello", "braccia"]],
  ["Gambe", ["squat", "leg", "affondi", "gambe", "polpacc", "calf", "glute", "hip thrust", "pressa", "femoral"]],
];

function classify(name: string): MuscleGroup {
  const n = name.toLowerCase();
  for (const [group, words] of GROUP_KEYWORDS) {
    if (words.some((w) => n.includes(w))) return group;
  }
  return "Altro";
}

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function fmt(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits).replace(/\.0$/, "");
}

function startOfWeekIso(offsetWeeks = 0) {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // monday = 0
  d.setDate(d.getDate() - day - offsetWeeks * 7);
  return d.toISOString().slice(0, 10);
}

const chartAxis = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="label-caps mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="num text-foreground">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

export function DashboardMetrics({
  only,
}: {
  only?: "metrics" | "charts" | "weight" | "volume" | "strength";
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const from30 = isoDaysAgo(30);
      const from42 = isoDaysAgo(41);

      const [profileRes, checkinsRes, mealsRes, sessionsRes, programRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("target_kcal,target_protein_g,weight_kg")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("checkins")
          .select("date,weight_kg,energy")
          .gte("date", from42)
          .order("date", { ascending: true }),
        supabase.from("meals").select("date,protein_g,kcal").eq("date", todayIso()),
        supabase
          .from("workout_sessions")
          .select("id,date,day_name")
          .gte("date", from42)
          .order("date", { ascending: true }),
        supabase
          .from("programs")
          .select("id,name,program_days(id,name)")
          .eq("is_active", true)
          .is("archived_at", null)
          .maybeSingle(),
      ]);

      const sessions = sessionsRes.data ?? [];
      const sessionIds = sessions.map((s) => s.id);
      let sets: Array<{
        session_id: string;
        exercise_name: string;
        reps: number | null;
        weight_kg: number | null;
      }> = [];
      if (sessionIds.length) {
        const { data: setsData } = await supabase
          .from("workout_sets")
          .select("session_id,exercise_name,reps,weight_kg")
          .in("session_id", sessionIds);
        sets = setsData ?? [];
      }

      return {
        profile: (profileRes.data ?? null) as Profile | null,
        checkins: checkinsRes.data ?? [],
        meals: mealsRes.data ?? [],
        sessions,
        sets,
        plannedDays: programRes.data?.program_days?.length ?? 0,
        programName: programRes.data?.name ?? null,
      };
    },
  });

  const computed = useMemo(() => {
    if (!data) return null;
    const { checkins, meals, sessions, sets, profile, plannedDays } = data;

    // --- weight
    const today = todayIso();
    const weightToday = checkins.find((c) => c.date === today)?.weight_kg ?? null;
    const last7 = checkins.filter((c) => c.date >= isoDaysAgo(6) && c.weight_kg != null);
    const avg7 =
      last7.length > 0 ? last7.reduce((a, c) => a + Number(c.weight_kg), 0) / last7.length : null;

    // --- workouts this week
    const weekStart = startOfWeekIso();
    const workoutsThisWeek = sessions.filter((s) => s.date >= weekStart).length;

    // --- protein today
    const proteinToday = meals.reduce((a, m) => a + Number(m.protein_g ?? 0), 0);

    // --- fatigue score (last 4 days)
    const from4 = isoDaysAgo(3);
    const energy4 = checkins.filter((c) => c.date >= from4 && c.energy != null);
    const avgEnergy =
      energy4.length > 0 ? energy4.reduce((a, c) => a + Number(c.energy), 0) / energy4.length : null;
    const workouts4 = sessions.filter((s) => s.date >= from4).length;
    let fatigue: { level: "green" | "yellow" | "red" | "none"; label: string } = {
      level: "none",
      label: "Dati insufficienti",
    };
    if (avgEnergy !== null) {
      if (avgEnergy < 3) fatigue = { level: "red", label: "Fatica alta" };
      else if (avgEnergy >= 4 && workouts4 <= 3) fatigue = { level: "green", label: "Recuperato" };
      else fatigue = { level: "yellow", label: "Sotto carico" };
    }

    // --- weight chart 30d with 7d moving average
    const from30 = isoDaysAgo(29);
    const weightSeries = checkins
      .filter((c) => c.date >= from30 && c.weight_kg != null)
      .map((c) => ({ date: c.date, weight: Number(c.weight_kg) }));
    const weightChart = weightSeries.map((point, i) => {
      const window = weightSeries.slice(Math.max(0, i - 6), i + 1);
      const ma = window.reduce((a, p) => a + p.weight, 0) / window.length;
      return {
        date: point.date.slice(5),
        Peso: Number(point.weight.toFixed(1)),
        "Media 7g": Number(ma.toFixed(1)),
      };
    });

    // --- volume per week per muscle group (last 6 weeks)
    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const weeks: Array<{ start: string; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const start = startOfWeekIso(i);
      weeks.push({ start, label: start.slice(5) });
    }
    const volumeChart = weeks.map((w, idx) => {
      const end = idx === weeks.length - 1 ? "9999-12-31" : weeks[idx + 1]!.start;
      const row: Record<string, number | string> = { week: w.label };
      MUSCLE_GROUPS.forEach((g) => (row[g] = 0));
      for (const s of sets) {
        const sess = sessionById.get(s.session_id);
        if (!sess) continue;
        if (sess.date < w.start || sess.date >= end) continue;
        const g = classify(s.exercise_name);
        row[g] = (row[g] as number) + 1;
      }
      return row;
    });
    const activeGroups = MUSCLE_GROUPS.filter((g) =>
      volumeChart.some((row) => (row[g] as number) > 0),
    );

    // --- strength trend per exercise (last 6 sessions)
    const byExercise = new Map<
      string,
      Map<string, { date: string; volume: number; topWeight: number }>
    >();
    for (const s of sets) {
      const sess = sessionById.get(s.session_id);
      if (!sess) continue;
      const name = s.exercise_name;
      if (!byExercise.has(name)) byExercise.set(name, new Map());
      const per = byExercise.get(name)!;
      const cur = per.get(s.session_id) ?? { date: sess.date, volume: 0, topWeight: 0 };
      const reps = Number(s.reps ?? 0);
      const kg = Number(s.weight_kg ?? 0);
      cur.volume += reps * kg;
      cur.topWeight = Math.max(cur.topWeight, kg);
      per.set(s.session_id, cur);
    }
    const strength = Array.from(byExercise.entries())
      .filter(([, per]) => per.size > 0)
      .map(([name, per]) => {
        const entries = Array.from(per.values())
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-6);
        const first = entries[0]!;
        const last = entries[entries.length - 1]!;
        let trend: "up" | "down" | "flat" = "flat";
        if (entries.length >= 2 && first.topWeight > 0) {
          const delta = (last.topWeight - first.topWeight) / first.topWeight;
          if (delta > 0.01) trend = "up";
          else if (delta < -0.01) trend = "down";
        }
        return { name, entries, trend, last };
      })
      .sort((a, b) => b.entries.length - a.entries.length);

    return {
      weightToday,
      avg7,
      workoutsThisWeek,
      plannedDays,
      proteinToday,
      proteinTarget: profile?.target_protein_g ?? null,
      fatigue,
      avgEnergy,
      workouts4,
      weightChart,
      volumeChart,
      activeGroups,
      strength,
    };
  }, [data]);

  if (isLoading || !computed) {
    if (only === "charts") return null;
    if (only === "weight" || only === "volume" || only === "strength") {
      return (
        <section className="border border-border p-5">
          <p className="label-caps">—</p>
          <div className="mt-6 h-64 animate-pulse rounded bg-muted" />
        </section>
      );
    }
    return (
      <div className="grid gap-px border border-border sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-border p-5 not-last:border-r">
            <p className="label-caps">—</p>
            <p className="num mt-3 text-2xl text-muted-foreground">…</p>
          </div>
        ))}
      </div>
    );
  }

  const weightDelta =
    computed.weightToday != null && computed.avg7 != null
      ? computed.weightToday - computed.avg7
      : null;

  const fatigueColor =
    computed.fatigue.level === "green"
      ? "bg-emerald-500"
      : computed.fatigue.level === "red"
        ? "bg-destructive"
        : computed.fatigue.level === "yellow"
          ? "bg-amber-500"
          : "bg-muted-foreground";

  return (
    <div className="space-y-10">
      {/* Quick metrics */}
      <div className={`grid gap-px border border-border sm:grid-cols-3 ${only && only !== "metrics" ? "hidden" : ""}`}>
        <div className="border-border p-5 not-last:border-r">
          <p className="label-caps">Peso oggi</p>
          <p className="num mt-3 text-2xl">
            {fmt(computed.weightToday)}
            <span className="ml-1 text-sm text-muted-foreground">kg</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            media 7g {fmt(computed.avg7)} kg
            {weightDelta != null && (
              <span className="num ml-2">
                {weightDelta >= 0 ? "+" : ""}
                {fmt(weightDelta)}
              </span>
            )}
          </p>
        </div>

        <div className="border-border p-5 not-last:border-r">
          <p className="label-caps">Allenamenti settimana</p>
          <p className="num mt-3 text-2xl">
            {computed.workoutsThisWeek}
            <span className="ml-1 text-sm text-muted-foreground">
              / {computed.plannedDays || "—"}
            </span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {computed.plannedDays
              ? `${Math.max(0, computed.plannedDays - computed.workoutsThisWeek)} da fare`
              : "Nessuna scheda attiva"}
          </p>
        </div>


        <div className="border-border p-5 not-last:border-r">
          <p className="label-caps">Fatigue score</p>
          <p className="mt-3 flex items-center gap-2 text-2xl">
            <span className={`inline-block size-3 rounded-full ${fatigueColor}`} />
            <span className="text-base">{computed.fatigue.label}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            energia media {fmt(computed.avgEnergy)} · {computed.workouts4} allenamenti / 4g
          </p>
        </div>
      </div>

      {/* Weight chart */}
      {(only === undefined || only === "charts" || only === "weight") && (
        <section className="border border-border p-5">
          <p className="label-caps">Andamento peso — 30 giorni</p>
          {computed.weightChart.length < 2 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Servono almeno due check-in con il peso per disegnare il trend.
            </p>
          ) : (
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={computed.weightChart}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" {...chartAxis} tickLine={false} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} {...chartAxis} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="Peso"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Media 7g"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      {/* Volume chart */}
      <section className={`border border-border p-5 ${only && only !== "volume" && only !== "charts" ? "hidden" : ""}`}>
        <p className="label-caps">Volume allenamento — serie per gruppo</p>
        {computed.activeGroups.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nessuna serie registrata nelle ultime 6 settimane.
          </p>
        ) : (
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={computed.volumeChart}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" {...chartAxis} tickLine={false} />
                <YAxis {...chartAxis} tickLine={false} width={30} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "color-mix(in oklch, var(--muted) 40%, transparent)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {computed.activeGroups.map((g) => (
                  <Bar key={g} dataKey={g} stackId="v" fill={GROUP_COLORS[g]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Strength trend */}
      <section className={`border border-border p-5 ${only && only !== "strength" && only !== "charts" ? "hidden" : ""}`}>
        <p className="label-caps">Trend forza per esercizio</p>
        {computed.strength.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Logga qualche allenamento per vedere il trend di forza.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {computed.strength.map((ex) => (
              <div key={ex.name} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{ex.name}</p>
                  <p className="num mt-1 text-xs text-muted-foreground">
                    {ex.entries.map((e) => fmt(e.topWeight)).join(" · ")} kg
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    carico massimo per sessione (ultime {ex.entries.length})
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="num text-xs text-muted-foreground">
                    top {fmt(ex.last.topWeight)} kg
                  </span>
                  <span
                    className={
                      ex.trend === "up"
                        ? "text-emerald-500"
                        : ex.trend === "down"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }
                  >
                    {ex.trend === "up" ? "↑" : ex.trend === "down" ? "↓" : "→"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
