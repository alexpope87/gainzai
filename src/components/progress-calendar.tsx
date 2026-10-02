import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const WEEKDAYS = ["L", "M", "M", "G", "V", "S", "D"];

function localISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthBounds(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return { start: localISO(start), end: localISO(end) };
}

function monthTitle(month: Date) {
  const title = month.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function ProgressCalendar() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const bounds = monthBounds(month);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["progress-calendar", bounds.start, bounds.end],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { sessions: [], checkins: [], sets: [] };

      const [sessionsResult, checkinsResult] = await Promise.all([
        supabase
          .from("workout_sessions")
          .select("id,date,day_name")
          .gte("date", bounds.start)
          .lte("date", bounds.end)
          .order("date", { ascending: true }),
        supabase
          .from("checkins")
          .select("date")
          .gte("date", bounds.start)
          .lte("date", bounds.end),
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (checkinsResult.error) throw checkinsResult.error;

      const sessions = sessionsResult.data ?? [];
      const sessionIds = sessions.map((session) => session.id);
      if (sessionIds.length === 0) {
        return { sessions, checkins: checkinsResult.data ?? [], sets: [] };
      }

      const setsResult = await supabase
        .from("workout_sets")
        .select("session_id,exercise_name")
        .in("session_id", sessionIds);
      if (setsResult.error) throw setsResult.error;

      return {
        sessions,
        checkins: checkinsResult.data ?? [],
        sets: setsResult.data ?? [],
      };
    },
  });

  const calendar = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const leadingBlanks = (first.getDay() + 6) % 7;
    const checkinDates = new Set((data?.checkins ?? []).map((checkin) => checkin.date));
    const sessionsByDate = new Map<string, NonNullable<typeof data>["sessions"]>();

    for (const session of data?.sessions ?? []) {
      const sessions = sessionsByDate.get(session.date) ?? [];
      sessions.push(session);
      sessionsByDate.set(session.date, sessions);
    }

    const exerciseNamesBySession = new Map<string, Set<string>>();
    for (const set of data?.sets ?? []) {
      const names = exerciseNamesBySession.get(set.session_id) ?? new Set<string>();
      names.add(set.exercise_name);
      exerciseNamesBySession.set(set.session_id, names);
    }

    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const date = localISO(new Date(month.getFullYear(), month.getMonth(), index + 1));
      return {
        day: index + 1,
        date,
        hasCheckin: checkinDates.has(date),
        sessions: (sessionsByDate.get(date) ?? []).map((session) => ({
          ...session,
          completedExercises: exerciseNamesBySession.get(session.id)?.size ?? 0,
        })),
      };
    });

    return { days, leadingBlanks };
  }, [data, month]);

  const selectedSessions = calendar.days.find((day) => day.date === selectedDate)?.sessions ?? [];
  const today = localISO(new Date());

  function changeMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setSelectedDate(null);
  }

  return (
    <section className="border border-border p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Mese precedente"
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <h2 className="text-base font-semibold">{monthTitle(month)}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Mese successivo"
          onClick={() => changeMonth(1)}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-7" aria-label={`Calendario ${monthTitle(month)}`}>
        {WEEKDAYS.map((weekday, index) => (
          <div key={`${weekday}-${index}`} className="label-caps py-2 text-center" aria-hidden="true">
            {weekday}
          </div>
        ))}
        {Array.from({ length: calendar.leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} aria-hidden="true" />
        ))}
        {calendar.days.map((day) => {
          const hasWorkout = day.sessions.length > 0;
          const selected = selectedDate === day.date;
          return (
            <Button
              key={day.date}
              type="button"
              variant="ghost"
              disabled={!hasWorkout}
              aria-label={`${day.day} ${monthTitle(month)}${hasWorkout ? ", allenamento registrato" : day.hasCheckin ? ", check-in registrato" : ""}`}
              aria-pressed={hasWorkout ? selected : undefined}
              onClick={() => setSelectedDate(day.date)}
              className={`relative aspect-square h-auto min-h-11 w-full rounded-none p-0 text-sm disabled:pointer-events-none disabled:opacity-100 ${
                selected ? "bg-accent text-accent-foreground hover:bg-accent" : ""
              } ${day.date === today && !selected ? "ring-1 ring-inset ring-border" : ""}`}
            >
              <span>{day.day}</span>
              {(hasWorkout || day.hasCheckin) && (
                <span
                  className={`absolute bottom-1.5 size-1.5 rounded-full ${
                    hasWorkout ? (selected ? "bg-accent-foreground" : "bg-accent") : "bg-muted-foreground"
                  }`}
                  aria-hidden="true"
                />
              )}
            </Button>
          );
        })}
      </div>

      {isLoading && <p className="mt-5 text-center text-sm text-muted-foreground">Caricamento calendario…</p>}
      {isError && <p className="mt-5 text-center text-sm text-destructive">Calendario non disponibile.</p>}

      {selectedSessions.length > 0 && (
        <div className="mt-5 divide-y divide-border border-t border-border" aria-live="polite">
          {selectedSessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-4 py-3">
              <p className="min-w-0 truncate text-sm font-medium">{session.day_name || "Allenamento"}</p>
              <p className="num shrink-0 text-xs text-muted-foreground">
                {session.completedExercises} {session.completedExercises === 1 ? "esercizio" : "esercizi"}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}