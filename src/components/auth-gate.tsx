"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";

type AuthMethod = "email-link" | "password";
type PasswordAction = "sign-in" | "sign-up";

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
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email-link");
  const [passwordAction, setPasswordAction] =
    useState<PasswordAction>("sign-in");
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

  const clearFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const chooseAuthMethod = (method: AuthMethod) => {
    setAuthMethod(method);
    clearFeedback();
  };

  const choosePasswordAction = (action: PasswordAction) => {
    setPasswordAction(action);
    clearFeedback();
  };

  const signInWithEmailLink = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setSubmitting(true);
    clearFeedback();

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        shouldCreateUser: false,
      },
    });

    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage(
      "Check your email for the one-time sign-in link. It will return you to this app.",
    );
  };

  const submitPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    if (passwordAction === "sign-up" && password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    if (passwordAction === "sign-in") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      setSubmitting(false);

      if (signInError) {
        setError(signInError.message);
      }

      return;
    }

    const {
      data,
      error: signUpError,
    } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      setUser(data.session.user);
      return;
    }

    setMessage(
      "Account created. Check your email to confirm it, then return here to sign in.",
    );
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

          <p className="mt-5 text-sm font-bold text-stone-600">
            Choose a one-time email link or use an email and password.
          </p>

          <div
            aria-label="Sign-in method"
            className="mt-3 grid grid-cols-2 rounded-lg bg-stone-100 p-1"
          >
            <button
              aria-pressed={authMethod === "email-link"}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-black transition ${
                authMethod === "email-link"
                  ? "bg-white text-stone-950 shadow-sm"
                  : "text-stone-500 hover:text-stone-800"
              }`}
              onClick={() => chooseAuthMethod("email-link")}
              type="button"
            >
              <Mail className="h-4 w-4" />
              Email link
            </button>
            <button
              aria-pressed={authMethod === "password"}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-black transition ${
                authMethod === "password"
                  ? "bg-white text-stone-950 shadow-sm"
                  : "text-stone-500 hover:text-stone-800"
              }`}
              onClick={() => chooseAuthMethod("password")}
              type="button"
            >
              <KeyRound className="h-4 w-4" />
              Password
            </button>
          </div>

          {authMethod === "password" ? (
            <div
              aria-label="Password account action"
              className="mt-4 grid grid-cols-2 gap-2"
            >
              <button
                aria-pressed={passwordAction === "sign-in"}
                className={`min-h-10 rounded-md border px-3 text-sm font-black transition ${
                  passwordAction === "sign-in"
                    ? "border-supabase-border bg-supabase-50 text-supabase-900"
                    : "border-stone-200 text-stone-500 hover:text-stone-800"
                }`}
                onClick={() => choosePasswordAction("sign-in")}
                type="button"
              >
                Sign in
              </button>
              <button
                aria-pressed={passwordAction === "sign-up"}
                className={`min-h-10 rounded-md border px-3 text-sm font-black transition ${
                  passwordAction === "sign-up"
                    ? "border-supabase-border bg-supabase-50 text-supabase-900"
                    : "border-stone-200 text-stone-500 hover:text-stone-800"
                }`}
                onClick={() => choosePasswordAction("sign-up")}
                type="button"
              >
                Create account
              </button>
            </div>
          ) : null}

          <form
            className="mt-4 grid gap-3"
            onSubmit={
              authMethod === "email-link"
                ? signInWithEmailLink
                : submitPassword
            }
          >
            <label className="grid gap-2 text-sm font-black text-stone-600">
              Email
              <input
                autoComplete="email"
                className="min-h-12 rounded-lg border border-stone-200 px-3 text-base font-bold text-stone-950 outline-none focus:ring-4 focus:ring-supabase-100"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="parent@example.com"
                required
                type="email"
                value={email}
              />
            </label>
            {authMethod === "password" ? (
              <label className="grid gap-2 text-sm font-black text-stone-600">
                Password
                <input
                  autoComplete={
                    passwordAction === "sign-up"
                      ? "new-password"
                      : "current-password"
                  }
                  className="min-h-12 rounded-lg border border-stone-200 px-3 text-base font-bold text-stone-950 outline-none focus:ring-4 focus:ring-supabase-100"
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
            ) : null}
            {authMethod === "password" && passwordAction === "sign-up" ? (
              <label className="grid gap-2 text-sm font-black text-stone-600">
                Confirm password
                <input
                  autoComplete="new-password"
                  className="min-h-12 rounded-lg border border-stone-200 px-3 text-base font-bold text-stone-950 outline-none focus:ring-4 focus:ring-supabase-100"
                  minLength={8}
                  onChange={(event) =>
                    setPasswordConfirmation(event.target.value)
                  }
                  required
                  type="password"
                  value={passwordConfirmation}
                />
              </label>
            ) : null}
            <button
              className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-supabase-border bg-supabase px-4 font-black text-stone-950 shadow-sm transition hover:bg-supabase-hover disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {authMethod === "email-link" ? (
                <Mail className="h-5 w-5" />
              ) : passwordAction === "sign-up" ? (
                <UserPlus className="h-5 w-5" />
              ) : (
                <KeyRound className="h-5 w-5" />
              )}
              {submitting
                ? authMethod === "email-link"
                  ? "Sending link"
                  : passwordAction === "sign-up"
                    ? "Creating account"
                    : "Signing in"
                : authMethod === "email-link"
                  ? "Send sign-in link"
                  : passwordAction === "sign-up"
                    ? "Create account"
                    : "Sign in"}
            </button>
          </form>

          {message ? <p className="mt-4 font-bold text-supabase-800">{message}</p> : null}
          {error ? <p className="mt-4 font-bold text-rose-700">{error}</p> : null}
          <p className="mt-5 text-sm font-medium text-stone-500">
            Email links only work for existing accounts. New parents can create
            an account with a password. Kids still use player cards after a
            parent signs in on this device.
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
