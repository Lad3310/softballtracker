"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LogOut, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";

export function AuthGate({
  children,
  showAccountBar = false,
}: {
  children: ReactNode;
  showAccountBar?: boolean;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(hasSupabaseConfig());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) {
        return;
      }

      if (sessionError) {
        setError(sessionError.message);
      }

      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      setError(null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!supabase) {
    return children;
  }

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage("Check your email for the sign-in link.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-50 p-4">
        <section className="rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm">
          <Sparkles className="mx-auto h-10 w-10 animate-pulse text-supabase-700" />
          <p className="mt-3 text-xl font-black text-stone-950">
            Checking parent sign-in.
          </p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-6">
        <section className="rounded-lg border border-supabase-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-supabase text-stone-950">
              <ShieldCheck className="h-7 w-7" />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-supabase-800">
                Parent sign-in
              </p>
              <h1 className="text-2xl font-black text-stone-950">Open your family tracker</h1>
            </div>
          </div>

          <form className="mt-6 grid gap-3" onSubmit={signIn}>
            <label className="grid gap-2 text-sm font-black text-stone-600">
              Email
              <input
                className="min-h-12 rounded-lg border border-stone-200 px-3 text-base font-bold text-stone-950 outline-none focus:ring-4 focus:ring-supabase-100"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="parent@example.com"
                required
                type="email"
                value={email}
              />
            </label>
            <button
              className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-supabase-border bg-supabase px-4 font-black text-stone-950 shadow-sm transition hover:bg-supabase-hover disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              <Mail className="h-5 w-5" />
              {submitting ? "Sending link" : "Send sign-in link"}
            </button>
          </form>

          {message ? <p className="mt-4 font-bold text-supabase-800">{message}</p> : null}
          {error ? <p className="mt-4 font-bold text-rose-700">{error}</p> : null}
          <p className="mt-5 text-sm font-medium text-stone-500">
            Kids still use player cards after a parent signs in on this device.
          </p>
        </section>
      </main>
    );
  }

  return (
    <>
      {showAccountBar ? (
        <div className="border-b border-stone-200 bg-white/80 px-4 py-2 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="truncate text-sm font-bold text-stone-600">{user.email}</p>
            <button
              className="flex min-h-10 items-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-black text-stone-700"
              onClick={signOut}
              type="button"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
}
