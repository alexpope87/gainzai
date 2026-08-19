import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accedi — GAINZ" },
      { name: "description", content: "Accedi o crea il tuo account GAINZ per iniziare." },
      { property: "og:title", content: "Accedi — GAINZ" },
      { property: "og:description", content: "Accedi o crea il tuo account GAINZ." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email({ message: "Email non valida" }).max(255),
  password: z.string().min(8, { message: "Minimo 8 caratteri" }).max(72),
  name: z.string().trim().max(80).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleForgotPassword() {
    const parsedEmail = z.string().trim().email().safeParse(email);
    if (!parsedEmail.success) {
      toast.error("Inserisci prima la tua email");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success("Email di reset inviata");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile inviare l'email");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, name });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dati non validi");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name: parsed.data.name || null },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
        navigate({ to: "/onboarding", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Qualcosa è andato storto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        <Link to="/">
          <BrandLogo className="text-base" />
        </Link>

      </div>

      <div className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-sm">
          {checkEmail ? (
            <div>
              <p className="label-caps">Conferma richiesta</p>
              <h1 className="mt-4 text-2xl font-semibold">Controlla la tua email</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Ti abbiamo inviato un link di conferma a {email}. Cliccalo per attivare l'account,
                poi torna qui per accedere.
              </p>
              <Button
                className="mt-6 w-full"
                variant="secondary"
                onClick={() => {
                  setCheckEmail(false);
                  setMode("signin");
                }}
              >
                Torna al login
              </Button>
            </div>
          ) : (
            <>
              <p className="label-caps">{mode === "signin" ? "Bentornato" : "Nuovo account"}</p>
              <h1 className="mt-4 text-2xl font-semibold">
                {mode === "signin" ? (
                  <>
                    Accedi a G{""}
                    <span className="text-[#00FF87]">AI</span>NZ
                  </>
                ) : (
                  "Crea il tuo account"
                )}
              </h1>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Marco"
                      autoComplete="name"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimo 8 caratteri"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                  />
                </div>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Password dimenticata?
                  </button>
                )}
                {resetSent && (
                  <p className="text-xs text-muted-foreground">
                    Ti abbiamo inviato un link per reimpostare la password a {email}.
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full bg-accent text-white hover:bg-accent/90"
                  disabled={loading}
                >
                  {loading ? "Attendi…" : mode === "signin" ? "Accedi" : "Crea account"}
                </Button>
              </form>

              <button
                type="button"
                className="mt-6 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin"
                  ? "Non hai un account? Registrati"
                  : "Hai già un account? Accedi"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
