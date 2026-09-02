import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export type ProgramRow = {
  id: string;
  name: string;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
};

export function useProgramsQuery() {
  return useQuery({
    queryKey: ["programs"],
    queryFn: async (): Promise<ProgramRow[]> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      const { data, error } = await supabase
        .from("programs")
        .select("id, name, is_active, archived_at, created_at")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProgramRow[];
    },
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ProgramList({
  compact = false,
  onChanged,
}: {
  compact?: boolean;
  onChanged?: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: programs = [], isLoading } = useProgramsQuery();

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["programs"] });
    onChanged?.();
  }

  async function toggleActive(p: ProgramRow) {
    const activating = !p.is_active || !!p.archived_at;
    const { error } = await supabase
      .from("programs")
      .update({ is_active: activating, archived_at: activating ? null : p.archived_at })
      .eq("id", p.id);
    if (error) {
      toast.error("Operazione fallita");
      return;
    }
    toast.success(activating ? "Scheda attivata" : "Scheda disattivata");
    await refresh();
  }

  async function toggleArchive(p: ProgramRow) {
    const archiving = !p.archived_at;
    const { error } = await supabase
      .from("programs")
      .update({
        archived_at: archiving ? new Date().toISOString() : null,
        is_active: archiving ? false : p.is_active,
      })
      .eq("id", p.id);
    if (error) {
      toast.error("Operazione fallita");
      return;
    }
    toast.success(archiving ? "Scheda archiviata" : "Scheda ripristinata");
    await refresh();
  }

  async function remove(p: ProgramRow) {
    if (typeof window !== "undefined" && !window.confirm(`Eliminare "${p.name}"?`)) return;
    const { error } = await supabase.from("programs").delete().eq("id", p.id);
    if (error) {
      toast.error("Eliminazione fallita");
      return;
    }
    toast.success("Scheda eliminata");
    await refresh();
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Caricamento schede…</p>;
  }

  if (programs.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna scheda salvata.</p>;
  }

  const visible = compact ? programs.filter((p) => !p.archived_at).slice(0, 3) : programs;

  return (
    <div className="divide-y divide-border border border-border">
      {visible.map((p) => (
        <div
          key={p.id}
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <Link
            to="/programs/$id"
            params={{ id: p.id }}
            className="min-w-0 flex-1 transition-opacity hover:opacity-70"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium">{p.name}</p>
              {p.is_active && !p.archived_at && (
                <span className="label-caps border border-accent px-2 py-0.5 text-accent">
                  Attiva
                </span>
              )}
              {!p.is_active && !p.archived_at && (
                <span className="label-caps border border-border px-2 py-0.5 text-muted-foreground">
                  Non attiva
                </span>
              )}
              {p.archived_at && (
                <span className="label-caps border border-border px-2 py-0.5 text-muted-foreground">
                  Archiviata
                </span>
              )}
            </div>
            <p className="num mt-1 text-xs text-muted-foreground">
              Caricata il {formatDate(p.created_at)} · tocca per modificare
            </p>
          </Link>


          {!compact && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={p.is_active && !p.archived_at ? "ghost" : "secondary"}
                onClick={() => void toggleActive(p)}
              >
                {p.is_active && !p.archived_at ? "Disattiva" : "Attiva"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void toggleArchive(p)}>
                {p.archived_at ? "Ripristina" : "Archivia"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void remove(p)}>
                Elimina
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
