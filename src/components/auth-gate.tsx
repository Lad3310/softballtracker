"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";

type AccessStatus = "checking" | "allowed" | "denied";

function isBrowserSecurityError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);

  return name === "SecurityError" || /operation is insecure|security/i.test(message);
}

function signInErrorMessage(error: unknown) {
  if (isBrowserSecurityError(error)) {
    return "This browser is blocking secure sign-in storage. Open the HTTPS app link in a normal browser window and allow cookies or site data for this site.";
  }

  return error instanceof Error ? error.message : "Sign-in failed.";
}

function getAuthRedirectUrl() {
  return new URL("/", window.location.origin).toString();
}

export function AuthGate({
  children,
  showAccountBar = false,
}: {
  children: ReactNode;
  showAccountBar?: boolean;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("checking");
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

    const hasTrackerAccess = async (activeUser: User) => {
      const membership = await supabase
        .from("softball_family_members")
        .select("id")
        .eq("user_id", activeUser.id)
        .limit(1)
        .maybeSingle();

      if (membership.error) {
        throw membership.error;
      }

      if (membership.data) {
        return true;
      }

      if (!activeUser.email) {
        return false;
      }

      const invitation = await supabase
        .from("softball_app_invitations")
        .select("id")
        .eq("email", activeUser.email.trim().toLowerCase())
        .is("accepted_at", null)
        .limit(1)
        .maybeSingle();

      if (invitation.error) {
        throw invitation.error;
      }

      return Boolean(invitation.data);
    };

    const applyUser = async (activeUser: User | null) => {
      if (!mounted) {
        return;
      }

      if (!activeUser) {
        setUser(null);
        setAccessStatus("checking");
        setLoading(false);
        return;
      }

      setLoading(true);
      setUser(activeUser);
      setAccessStatus("checking");

      try {
        const allowed = await hasTrackerAccess(activeUser);

        if (mounted) {
          setAccessStatus(allowed ? "allowed" : "denied");
        }
      } catch (accessError) {
        if (mounted) {
          setError(signInErrorMessage(accessError));
          setAccessStatus("denied");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!mounted) {
          return;
        }

        if (sessionError) {
          setError(signInErrorMessage(sessionError));
        }

        void applyUser(data.session?.user ?? null);
      })
      .catch((sessionError: unknown) => {
        if (!mounted) {
          return;
        }

        setError(signInErrorMessage(sessionError));
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setError(null);
      window.setTimeout(() => {
        void applyUser(session?.user ?? null);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!supabase) {
    return children;
  }

  const signInWithEmailLink = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    let signInError: unknown = null;

    try {
      const result = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          shouldCreateUser: true,
        },
      });
      signInError = result.error;
    } catch (caught) {
      signInError = caught;
    }

    setSubmitting(false);

    if (signInError) {
      setError(signInErrorMessage(signInError));
      return;
    }

    setMessage(`We sent a secure sign-in link to ${email.trim()}.`);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAccessStatus("checking");
  };

  if (loading || (user && accessStatus === "checking")) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-violet-50 via-white to-sky-50 p-4">
        <section className="rounded-3xl border border-violet-100 bg-white px-8 py-7 text-center shadow-xl shadow-violet-200/40">
          <Sparkles className="mx-auto h-9 w-9 animate-pulse text-violet-600" />
          <p className="mt-3 text-lg font-black text-slate-950">
            Opening your tracker…
          </p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-white to-sky-50 px-4 py-8">
        <div
          aria-hidden="true"
          className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-fuchsia-200/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl"
        />

        <section className="relative w-full max-w-md rounded-[2rem] border border-violet-100 bg-white/95 p-6 shadow-xl shadow-violet-200/40 backdrop-blur sm:p-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-200">
            <Sparkles className="h-7 w-7" />
          </span>

          <p className="mt-6 text-sm font-black uppercase tracking-[0.16em] text-violet-600">
            Family training tracker
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-3 text-base font-medium leading-7 text-slate-600">
            Enter the email that received your family invite. We’ll send a
            secure link—no password needed.
          </p>

          <form className="mt-7 grid gap-4" onSubmit={signInWithEmailLink}>
            <label className="grid gap-2 text-sm font-black text-slate-700">
              Email address
              <input
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                className="min-h-14 rounded-2xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-950 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </label>
            <button
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              <Mail className="h-5 w-5" />
              {submitting ? "Sending link…" : "Email me a sign-in link"}
            </button>
          </form>

          {message ? (
            <p
              className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold leading-6 text-sky-900"
              role="status"
            >
              {message} You can close this page after it arrives.
            </p>
          ) : null}
          {error ? (
            <p
              className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex items-start gap-3 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-500">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
            <p>
              Each family has its own private workspace. Kids can use their
              athlete cards after a parent signs in on this device.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (accessStatus === "denied") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-violet-50 via-white to-sky-50 px-4 py-8">
        <section className="w-full max-w-md rounded-[2rem] border border-amber-200 bg-white p-7 text-center shadow-xl shadow-amber-100/60">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <LockKeyhole className="h-7 w-7" />
          </span>
          <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-amber-700">
            Invitation needed
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            This email isn’t connected yet
          </h1>
          <p className="mt-3 font-medium leading-7 text-slate-600">
            Ask the person who shared the tracker to invite {user.email}, then
            try the sign-in link again.
          </p>
          {error ? (
            <p className="mt-4 text-sm font-bold text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
          <button
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 font-black text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-violet-100"
            onClick={signOut}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Use another email
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
      {showAccountBar ? (
        <div className="border-b border-violet-100 bg-white/85 px-4 py-2 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="truncate text-sm font-bold text-slate-600">{user.email}</p>
            <button
              className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-700 transition hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-violet-100"
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
