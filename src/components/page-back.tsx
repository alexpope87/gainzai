import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function PageBack({ to }: { to: string }) {
  return (
    <div className="sticky top-0 z-50 w-full bg-background/95 py-3 backdrop-blur">
      <Link
        to={to}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        aria-label="Torna indietro"
      >
        <ArrowLeft size={22} strokeWidth={2} />
      </Link>
    </div>
  );
}
