import { Button } from "@/components/ui/button";

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function shiftISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function label(iso: string) {
  const today = todayISO();
  if (iso === today) return "Oggi";
  if (iso === shiftISO(today, -1)) return "Ieri";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function DateNav({
  date,
  onChange,
}: {
  date: string;
  onChange: (iso: string) => void;
}) {
  const today = todayISO();
  const isToday = date === today;

  return (
    <div className="flex items-center justify-between border border-border">
      <Button
        variant="ghost"
        className="h-12 w-12 shrink-0 text-lg"
        aria-label="Giorno precedente"
        onClick={() => onChange(shiftISO(date, -1))}
      >
        ‹
      </Button>
      <div className="min-w-0 text-center">
        <p className="text-sm font-medium">{label(date)}</p>
        <p className="num text-xs text-muted-foreground">{date}</p>
      </div>
      <Button
        variant="ghost"
        className="h-12 w-12 shrink-0 text-lg"
        aria-label="Giorno successivo"
        disabled={isToday}
        onClick={() => onChange(shiftISO(date, 1))}
      >
        ›
      </Button>
    </div>
  );
}
