import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profilo — GAINZ" },
      { name: "description", content: "Dati personali, target giornalieri e piano alimentare." },
      { property: "og:title", content: "Profilo — GAINZ" },
      { property: "og:description", content: "Gestisci dati personali e target su GAINZ." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
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

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const rows: Array<[string, string]> = [
    ["Nome", profile?.name ?? "—"],
    ["Età", profile?.age != null ? `${profile.age} anni` : "—"],
    ["Altezza", profile?.height_cm != null ? `${profile.height_cm} cm` : "—"],
    ["Peso iniziale", profile?.weight_kg != null ? `${profile.weight_kg} kg` : "—"],
    ["Target kcal", profile?.target_kcal != null ? `${profile.target_kcal} kcal` : "—"],
    ["Target proteine", profile?.target_protein_g != null ? `${profile.target_protein_g} g` : "—"],
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 pt-10 pb-10">
      <p className="label-caps">Profilo</p>
      <h1 className="mt-4 text-3xl font-semibold">{profile?.name ?? "Il tuo profilo"}</h1>

      <section className="mt-8 border border-border">
        <div className="divide-y divide-border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className="num text-sm">{v}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" asChild>
          <Link to="/meal-plan">Piano alimentare</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link to="/onboarding">Modifica i miei dati</Link>
        </Button>
      </div>

      <div className="mt-10">
        <p className="label-caps">Impostazioni</p>
        <div className="mt-4">
          <Button variant="ghost" onClick={signOut}>
            Esci
          </Button>
        </div>
      </div>
    </main>
  );
}
