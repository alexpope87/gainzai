import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateAnalysis } from "@/lib/analysis.functions";
import { Button } from "@/components/ui/button";
import { PageBack } from "@/components/page-back";


export const Route = createFileRoute("/_authenticated/analysis")({
  head: () => ({
    meta: [
      { title: "Analisi serale — GAINZ" },
      {
        name: "description",
        content:
          "L'AI legge check-in, allenamenti e macro degli ultimi 7 giorni e ti dice cosa fare domani.",
      },
      { property: "og:title", content: "Analisi serale — GAINZ" },
      {
        property: "og:description",
        content: "Report in 5 sezioni: peso, forza, recupero, macro e priorità per domani.",
      },
    ],
  }),
  component: AnalysisPage,
});

type AnalysisRow = {
  id: string;
  date: string;
  peso: string;
  forza: string;
  recupero: string;
  macro: string;
  priorita: string;
  data_notes: string | null;
};

const SECTIONS: Array<{ key: keyof AnalysisRow; label: string }> = [
  { key: "peso", label: "Peso" },
  { key: "forza", label: "Forza" },
  { key: "recupero", label: "Recupero" },
  { key: "macro", label: "Macro" },
  { key: "priorita", label: "Priorità domani" },
];

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function AnalysisPage() {
  const queryClient = useQueryClient();
  const run = useServerFn(generateAnalysis);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .order("date", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data as AnalysisRow[];
    },
  });

  const loadQuotas = useServerFn(getAiQuotas);
  const { data: quotas } = useQuery({
    queryKey: ["ai-quotas"],
    queryFn: async () => await loadQuotas({}),
  });

  const mutation = useMutation({
    mutationFn: async () => await run({}),
    onSuccess: (data) => {
      setSelected((data as AnalysisRow).id);
      void queryClient.invalidateQueries({ queryKey: ["analyses"] });
      void queryClient.invalidateQueries({ queryKey: ["ai-quotas"] });
      toast.success("Analisi generata");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["ai-quotas"] });
    },
    onError: (e: Error) => toast.error(e.message || "Generazione fallita"),
  });

  const current = analyses.find((a) => a.id === selected) ?? analyses[0] ?? null;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-4">
        <PageBack to="/dashboard" />

        <p className="label-caps mt-4">Analisi serale</p>

        <h1 className="mt-3 text-3xl font-semibold">Cosa fare domani</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          L'AI legge check-in, allenamenti e macro degli ultimi 7 giorni e risponde in 5 sezioni.
        </p>

        <Button
          className="mt-6 w-full sm:w-auto"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Sto analizzando…" : "Genera analisi"}
        </Button>

        {current ? (
          <section className="mt-10 border border-border">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="num text-sm">{formatDate(current.date)}</p>
              {current.data_notes ? (
                <p className="text-xs text-muted-foreground">{current.data_notes}</p>
              ) : null}
            </div>
            {SECTIONS.map((s) => (
              <div key={s.key} className="border-b border-border p-5 last:border-b-0">
                <p className="label-caps">{s.label}</p>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">
                  {(current[s.key] as string) || "—"}
                </p>
              </div>
            ))}
          </section>
        ) : (
          <p className="mt-10 text-sm text-muted-foreground">
            {isLoading ? "Carico lo storico…" : "Nessuna analisi ancora. Generane una stasera."}
          </p>
        )}

        {analyses.length > 1 ? (
          <section className="mt-10">
            <p className="label-caps">Storico</p>
            <div className="mt-4 grid gap-px border border-border">
              {analyses.map((a) => {
                const active = current?.id === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelected(a.id)}
                    className={`flex items-center justify-between px-5 py-4 text-left transition-colors ${
                      active ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="num text-sm">{formatDate(a.date)}</span>
                    <span className="line-clamp-1 max-w-[60%] text-xs text-muted-foreground">
                      {a.priorita}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
