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
type AccessStatus = "checking" | "allowed" | "denied";

const NEW_ACCOUNT_PASSWORD_MIN_LENGTH = 6;

function isBrowserSecurityError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);

  return name === "SecurityError" || /operation is insecure|security/i.test(message);
}

function signInErrorMessage(error: unknown) {
  if (isBrowserSecurityError(error)) {
    return "This browser is blocking secure sign-in storage. Open the HTTPS app link in a normal browser window and allow cookies/site data for this site.";
  }

  return error instanceof Error ? error.message : "Sign-in failed.";
}

function getAuthRedirectUrl() {
  const redirectUrl = new URL("/", window.location.origin);
  const inviteToken = new URLSearchParams(window.location.search).get("invite");

  if (inviteToken) {
    redirectUrl.searchParams.set("invite", inviteToken);
  }

  return redirectUrl.toString();
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
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("checking");
  const [hasInviteLink, setHasInviteLink] = useState(false);
  const [loading, setLoading] = useState(hasSupabaseConfig());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHasInviteLink(
        Boolean(new URLSearchParams(window.location.search).get("invite")),
      );
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

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

      const normalizedEmail = activeUser.email?.trim().toLowerCase() ?? "";
      const [membership, invitation] = await Promise.all([
        supabase
          .from("softball_family_members")
          .select("id")
          .eq("user_id", activeUser.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("softball_app_invitations")
          .select("id")
          .eq("email", normalizedEmail)
          .limit(1)
          .maybeSingle(),
      ]);

      if (!mounted) {
        return;
      }

      const accessError = membership.error ?? invitation.error;

      if (accessError) {
        setError(accessError.message);
        setAccessStatus("denied");
        setLoading(false);
        return;
      }

      setAccessStatus(membership.data || invitation.data ? "allowed" : "denied");
      setLoading(false);
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

    let signInError: unknown = null;

    try {
      const result = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          shouldCreateUser: false,
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

    if (passwordAction === "sign-up" && !hasInviteLink) {
      setError("A private tracker invitation link is required to create an account.");
      return;
    }

    setSubmitting(true);

    if (passwordAction === "sign-in") {
      let signInError: unknown = null;

      try {
        const result = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        signInError = result.error;
      } catch (caught) {
        signInError = caught;
      }

      setSubmitting(false);

      if (signInError) {
        setError(signInErrorMessage(signInError));
      }

      return;
    }

    let signedUpUser: User | null = null;
    let signUpError: unknown = null;

    try {
      const result = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      signedUpUser = result.data.session?.user ?? null;
      signUpError = result.error;
    } catch (caught) {
      signUpError = caught;
    }

    setSubmitting(false);

    if (signUpError) {
      setError(signInErrorMessage(signUpError));
      return;
    }

    if (signedUpUser) {
      setUser(signedUpUser);
      return;
    }

    setMessage(
      "Signup request received. Check your email if this address is new. If it already has a Supabase account, choose Sign in instead.",
    );
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAccessStatus("checking");
  };

  if (loading || (user && accessStatus === "checking")) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-50 p-4">
        <section className="rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm">
          <Sparkles className="mx-auto h-10 w-10 animate-pulse text-supabase-700" />
          <p className="mt-3 text-xl font-black text-stone-950">
            Checking parent invitation.
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
                disabled={!hasInviteLink}
                onClick={() => choosePasswordAction("sign-up")}
                type="button"
              >
                {hasInviteLink ? "Create account" : "Invite required"}
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
                  minLength={
                    passwordAction === "sign-up"
                      ? NEW_ACCOUNT_PASSWORD_MIN_LENGTH
                      : undefined
                  }
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
                  minLength={NEW_ACCOUNT_PASSWORD_MIN_LENGTH}
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
            Email links only work for existing accounts. New families can
            create an account from a private tracker invitation link. Kids
            still use athlete cards after a parent signs in on this device.
          </p>
        </section>
      </main>
    );
  }

  if (accessStatus === "denied") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-6">
        <section className="rounded-lg border border-amber-300 bg-white p-5 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-12 w-12 text-amber-600" />
          <p className="mt-4 text-sm font-black uppercase tracking-wide text-amber-700">
            Invitation only
          </p>
          <h1 className="mt-1 text-3xl font-black text-stone-950">
            This account needs a tracker invite
          </h1>
          <p className="mt-3 font-bold text-stone-600">
            Ask a current practice-tracker parent to invite {user.email}.
            Your shared Supabase account still works normally in other apps.
          </p>
          <button
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-stone-200 px-4 font-black text-stone-700"
            onClick={signOut}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
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
