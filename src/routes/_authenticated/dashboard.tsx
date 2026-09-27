import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardActions } from "@/components/dashboard-actions";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Oggi — GAINZ" },
      { name: "description", content: "Le tue azioni di oggi: check-in, allenamento, macros e analisi AI." },
      { property: "og:title", content: "Oggi — GAINZ" },
      { property: "og:description", content: "Check-in, allenamento, macros e analisi AI in un tap." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!isLoading && profile && !profile.onboarded) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isLoading, profile, navigate]);

  return (
    <main className="mx-auto max-w-5xl px-6 pt-6 pb-10">
      <header className="flex flex-col items-center text-center">
        <BrandLogo className="text-[30px]" />
        <span className="mt-1 text-xs font-medium tracking-tight text-muted-foreground">
          Your data. Your gainz.
        </span>
      </header>

      <h1 className="mt-10 text-3xl font-semibold">
        {profile?.name ? `Ciao ${profile.name}!` : "Ciao!"}
      </h1>

      <div className="mt-8">
        <DashboardActions />
      </div>
    </main>
  );
}
