import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProgramList } from "@/components/program-list";
import { DashboardMetrics } from "@/components/dashboard-metrics";
import { DashboardActions } from "@/components/dashboard-actions";
import { BrandLogo } from "@/components/brand-logo";




export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — GAINZ" },
      { name: "description", content: "I tuoi dati, i tuoi target e le decisioni del coach AI." },
      { property: "og:title", content: "Dashboard — GAINZ" },
      { property: "og:description", content: "I tuoi dati e i target giornalieri su GAINZ." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-start justify-between px-6 py-6">
        <div className="flex flex-col">
          <BrandLogo className="text-base" />
          <span className="mt-1 text-xs font-medium tracking-tight text-muted-foreground">
            Your data. Your gainz.
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          Esci
        </Button>
      </header>

      <div className="mx-auto max-w-5xl px-6 pb-24">
        <p className="label-caps">Dashboard</p>
        <h1 className="mt-4 text-3xl font-semibold">
          {profile?.name ? `Ciao ${profile.name}!` : "Ciao!"}
        </h1>

        <div className="mt-10">
          <DashboardMetrics only="metrics" />
        </div>

        <div className="mt-10">
          <DashboardActions />
        </div>

        <div className="mt-10">
          <DashboardMetrics only="charts" />
        </div>




        <section className="mt-10">
          <div className="flex items-center justify-between">
            <p className="label-caps">Le tue schede</p>
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/program" })}>
              Gestisci
            </Button>
          </div>
          <div className="mt-4">
            <ProgramList compact />
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate({ to: "/meal-plan" })}>
            Piano alimentare
          </Button>
          <Button variant="secondary" onClick={() => navigate({ to: "/program" })}>
            La mia scheda
          </Button>
          <Button variant="secondary" onClick={() => navigate({ to: "/onboarding" })}>
            Modifica i miei dati
          </Button>
        </div>

      </div>
    </main>
  );
}
