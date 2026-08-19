import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

type Props = {
  /** Fallback destination when there is no history to go back to. */
  fallbackTo?: string;
  label?: string;
  className?: string;
};

export function BackNav({ fallbackTo = "/dashboard", label = "Indietro", className }: Props) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    void router.navigate({ to: fallbackTo });
  }

  return (
    <div
      className={`sticky top-0 z-20 -mx-5 mb-2 flex items-center justify-between bg-background/90 px-5 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:px-0 sm:py-0 ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={goBack}
        aria-label={label}
        className="-ml-2 flex h-11 items-center gap-2 px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={18} />
        {label}
      </button>
      <Link
        to="/dashboard"
        className="flex h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Dashboard
      </Link>
    </div>
  );
}
