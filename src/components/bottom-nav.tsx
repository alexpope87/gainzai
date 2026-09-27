import { Link, useRouterState } from "@tanstack/react-router";
import { Zap, LineChart, Dumbbell, User } from "lucide-react";

const TABS = [
  { to: "/dashboard", label: "Home", icon: Zap, match: ["/dashboard", "/checkin", "/workout", "/macros", "/analysis"] },
  { to: "/progress", label: "Progressi", icon: LineChart, match: ["/progress"] },
  { to: "/program", label: "Scheda", icon: Dumbbell, match: ["/program"] },
  { to: "/profile", label: "Profilo", icon: User, match: ["/profile", "/meal-plan", "/onboarding"] },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur">
      <ul className="mx-auto flex max-w-5xl">
        {TABS.map((tab) => {
          const active = tab.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
          const Icon = tab.icon;
          return (
            <li key={tab.to} className="flex-1">
              <Link
                to={tab.to}
                aria-current={active ? "page" : undefined}
                className={
                  "flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-wide uppercase transition-colors " +
                  (active ? "text-[#00FF87]" : "text-muted-foreground hover:text-foreground")
                }
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
