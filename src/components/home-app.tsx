"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BatteryCharging,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Clock,
  Dumbbell,
  Frown,
  Gauge,
  Heart,
  LayoutDashboard,
  Medal,
  Sparkles,
  Trophy,
  WifiOff,
} from "lucide-react";
import { FEELINGS, FOCUS_TAGS, MINUTE_PRESETS, PRACTICE_TYPES } from "@/lib/config";
import {
  createPracticeSessionFromInput,
  loadAppData,
  persistLocalState,
  pushSessionToSupabase,
  recomputeBadgesForPlayer,
  replaceBadgesRemote,
} from "@/lib/data-client";
import { getPlayerBadgeDetails } from "@/lib/badges";
import {
  getPendingMinutes,
  getRejectedCount,
  getSummerProgress,
  getWeeklyProgress,
} from "@/lib/progress";
import { getAppDateKey } from "@/lib/time";
import type {
  AppData,
  AppDataResult,
  DrillTemplate,
  HittingSide,
  LogSessionInput,
  Player,
  PracticeSession,
} from "@/lib/types";

type Screen = "picker" | "dashboard" | "log";

const PRACTICE_ICONS: Record<string, typeof Dumbbell> = {
  "Tee Work": CircleDot,
  "Side Soft Toss": Gauge,
  Fielding: ClipboardCheck,
  Throwing: BatteryCharging,
  Conditioning: Dumbbell,
  Game: Trophy,
  Other: Sparkles,
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ProgressBar({ value, tone = "green" }: { value: number; tone?: "green" | "blue" }) {
  return (
    <div className="h-4 w-full overflow-hidden rounded-full bg-stone-200">
      <div
        className={classNames(
          "h-full rounded-full transition-all",
          tone === "green" ? "bg-supabase" : "bg-sky-500",
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function StatusNote({
  queuedCount,
}: {
  queuedCount: number;
}) {
  if (queuedCount > 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900">
        <WifiOff className="h-4 w-4" />
        {queuedCount} saved on this device
      </div>
    );
  }

  return null;
}

function PlayerPicker({
  data,
  onPickPlayer,
}: {
  data: AppData;
  onPickPlayer: (playerId: string) => void;
}) {
  const queuedCount = data.sessions.filter((session) => session.sync_state === "queued").length;
  const pendingCount = data.sessions.filter((session) => session.status === "pending").length;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-4 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-supabase-800">
            Summer Softball
          </p>
          <h1 className="mt-1 text-3xl font-black text-stone-950 sm:text-5xl">
            Pick your player
          </h1>
        </div>
        <Link
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-supabase-border bg-supabase px-4 text-base font-black text-stone-950 shadow-sm transition hover:bg-supabase-hover focus:outline-none focus:ring-4 focus:ring-supabase-100"
          href="/parent"
        >
          <LayoutDashboard className="h-5 w-5" />
          Dashboard
        </Link>
      </header>

      <div className="mb-4">
        <StatusNote queuedCount={queuedCount} />
      </div>

      <section className="mb-4 rounded-lg border border-supabase-border bg-supabase-50 p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-supabase-800" />
              <h2 className="text-xl font-black text-stone-950">Family dashboard</h2>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-stone-500">
                  Pending
                </p>
                <p className="text-2xl font-black text-stone-950">{pendingCount}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-stone-500">
                  Players
                </p>
                <p className="text-2xl font-black text-stone-950">{data.players.length}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-stone-500">
                  Sessions
                </p>
                <p className="text-2xl font-black text-stone-950">{data.sessions.length}</p>
              </div>
            </div>
          </div>
          <Link
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-supabase-border bg-white px-4 font-black text-supabase-800 shadow-sm transition hover:bg-supabase-100"
            href="/parent"
          >
            <LayoutDashboard className="h-5 w-5" />
            Open Dashboard
          </Link>
        </div>
      </section>

      {data.players.length === 0 ? (
        <section className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
          <Trophy className="mb-4 h-12 w-12 text-supabase-700" />
          <h2 className="text-2xl font-black text-stone-950">Ready for players</h2>
          <p className="mt-2 max-w-md text-lg font-medium text-stone-600">
            Ask a grown-up to add player cards.
          </p>
        </section>
      ) : (
        <section className="grid flex-1 content-start gap-4 sm:grid-cols-2">
          {data.players.map((player) => {
            const today = getAppDateKey();
            const weekly = getWeeklyProgress(player, data.sessions, today);
            const pendingMinutes = getPendingMinutes(data.sessions, player.id);

            return (
              <button
                className="min-h-44 rounded-lg border border-stone-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-supabase-border hover:shadow-md focus:outline-none focus:ring-4 focus:ring-supabase-100"
                key={player.id}
                onClick={() => onPickPlayer(player.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-4xl font-black text-stone-950">{player.name}</h2>
                    <p className="mt-1 text-base font-bold text-stone-500">
                      {player.handedness === "switch"
                        ? "Switch hitter"
                        : `${player.handedness} handed`}
                    </p>
                  </div>
                  <ChevronRight className="mt-2 h-7 w-7 text-supabase-700" />
                </div>
                <div className="mt-8">
                  <div className="mb-2 flex items-center justify-between text-sm font-black text-stone-600">
                    <span>This week</span>
                    <span>{weekly.minutes} min</span>
                  </div>
                  <ProgressBar value={weekly.percent} />
                  {pendingMinutes > 0 ? (
                    <p className="mt-3 text-sm font-bold text-sky-700">
                      {pendingMinutes} minutes waiting
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </section>
      )}
    </main>
  );
}

function BadgeStrip({ player, data }: { player: Player; data: AppData }) {
  const badgeDetails = getPlayerBadgeDetails(player.id, data.playerBadges, data.badges);

  if (badgeDetails.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <Medal className="h-6 w-6 text-stone-400" />
          <p className="text-base font-bold text-stone-600">Badges will show up here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {badgeDetails.map(({ badge, playerBadge }) => (
        <div
          className="flex min-h-20 items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3"
          key={`${badge.id}-${playerBadge.week_key ?? "all"}`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-amber-700">
            {badge.icon}
          </div>
          <div>
            <p className="font-black text-stone-950">{badge.title}</p>
            <p className="text-sm font-medium text-stone-600">{badge.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayerDashboard({
  data,
  player,
  message,
  onBack,
  onLogPractice,
}: {
  data: AppData;
  player: Player;
  message: string | null;
  onBack: () => void;
  onLogPractice: () => void;
}) {
  const today = getAppDateKey();
  const weekly = getWeeklyProgress(player, data.sessions, today);
  const summer = getSummerProgress(player, data.sessions, today);
  const pendingMinutes = getPendingMinutes(data.sessions, player.id);
  const rejectedCount = getRejectedCount(data.sessions, player.id);
  const queuedCount = data.sessions.filter((session) => session.sync_state === "queued").length;

  // ASSUMPTION: Ages are not confirmed, so kid-facing copy stays short with oversized controls for younger elementary readers.
  // ASSUMPTION: Rejected sessions do not interrupt the child flow; the dashboard only says they need another try.
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 py-4 sm:px-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-supabase-border bg-supabase px-3 font-black text-stone-950 shadow-sm"
          href="/parent"
        >
          <LayoutDashboard className="h-5 w-5" />
          Dashboard
        </Link>
      </header>

      <section className="rounded-lg border border-supabase-border bg-supabase p-5 text-stone-950 shadow-sm">
        <p className="text-base font-black uppercase tracking-wide text-stone-800">
          Nice work
        </p>
        <h1 className="mt-1 text-4xl font-black sm:text-6xl">{player.name}</h1>
        {message ? <p className="mt-3 text-lg font-bold text-stone-900">{message}</p> : null}
      </section>

      <div className="mt-4">
        <StatusNote queuedCount={queuedCount} />
      </div>

      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Clock className="h-7 w-7 text-supabase-700" />
            <h2 className="text-xl font-black text-stone-950">This week</h2>
          </div>
          <p className="mt-5 text-3xl font-black text-stone-950">
            You practiced {weekly.minutes} minutes this week.
          </p>
          <p className="mt-2 text-lg font-bold text-stone-600">
            {weekly.met
              ? "Goal met. Big swing energy."
              : `You need ${weekly.remaining} more minutes this week.`}
          </p>
          <div className="mt-5">
            <ProgressBar value={weekly.percent} />
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-7 w-7 text-sky-600" />
            <h2 className="text-xl font-black text-stone-950">Summer</h2>
          </div>
          <p className="mt-5 text-3xl font-black text-stone-950">
            You practiced {summer.minutes} minutes this summer.
          </p>
          <p className="mt-2 text-lg font-bold text-stone-600">
            {summer.met
              ? "Summer goal complete."
              : `You need ${summer.remaining} more minutes for your summer goal.`}
          </p>
          <p className="mt-2 text-base font-bold text-sky-700">
            {summer.met
              ? "You are across the finish line."
              : `${summer.averageNeededPerWeek} minutes per week keeps you moving.`}
          </p>
          <div className="mt-5">
            <ProgressBar tone="blue" value={summer.percent} />
          </div>
        </div>
      </section>

      {pendingMinutes > 0 || rejectedCount > 0 ? (
        <section className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4">
          <p className="text-lg font-black text-sky-950">
            {pendingMinutes > 0
              ? `${pendingMinutes} minutes waiting for a grown-up to approve.`
              : "Nothing waiting right now."}
          </p>
          {rejectedCount > 0 ? (
            <p className="mt-1 text-base font-bold text-sky-800">
              {rejectedCount} practice {rejectedCount === 1 ? "needs" : "need"} another try.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="mt-4">
        <BadgeStrip data={data} player={player} />
      </section>

      <button
        className="mt-5 flex min-h-16 w-full items-center justify-center gap-3 rounded-lg bg-stone-950 px-5 text-xl font-black text-white shadow-sm transition hover:bg-stone-800 focus:outline-none focus:ring-4 focus:ring-stone-300"
        onClick={onLogPractice}
        type="button"
      >
        <Dumbbell className="h-7 w-7" />
        Log Practice
      </button>
    </main>
  );
}

function QuickLogFlow({
  player,
  templates,
  approvalRequired,
  onCancel,
  onSubmit,
}: {
  player: Player;
  templates: DrillTemplate[];
  approvalRequired: boolean;
  onCancel: () => void;
  onSubmit: (input: LogSessionInput) => void;
}) {
  const [step, setStep] = useState<"type" | "minutes" | "drills">("type");
  const [practiceType, setPracticeType] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [drills, setDrills] = useState<Array<{ label: string; completed: boolean }>>([]);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [focusTag, setFocusTag] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [hittingSide, setHittingSide] = useState<HittingSide | null>(null);

  const selectPracticeType = (type: string) => {
    const template = templates.find((candidate) => candidate.practice_type === type);

    setPracticeType(type);
    setDrills(
      (template?.items ?? []).map((item) => ({
        label: item.label,
        completed: true,
      })),
    );
    setStep("minutes");
  };

  const submit = () => {
    if (!practiceType || !minutes) {
      return;
    }

    onSubmit({
      player,
      practice_type: practiceType,
      minutes,
      drills,
      feeling,
      focus_tag: focusTag,
      notes: notes.trim() ? notes.trim() : null,
      hitting_side: hittingSide,
      require_parent_approval: approvalRequired,
    });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 py-4 sm:px-6">
      <header className="mb-5 flex items-center gap-3">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm"
          onClick={onCancel}
          type="button"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-supabase-800">
            {player.name}
          </p>
          <h1 className="text-2xl font-black text-stone-950 sm:text-4xl">
            Log practice
          </h1>
        </div>
      </header>

      {step === "type" ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {PRACTICE_TYPES.map((type) => {
            const Icon = PRACTICE_ICONS[type] ?? Sparkles;

            return (
              <button
                className="flex min-h-24 items-center gap-4 rounded-lg border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-supabase-border focus:outline-none focus:ring-4 focus:ring-supabase-100"
                key={type}
                onClick={() => selectPracticeType(type)}
                type="button"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-supabase-50 text-supabase-800">
                  <Icon className="h-8 w-8" />
                </span>
                <span className="text-2xl font-black text-stone-950">{type}</span>
              </button>
            );
          })}
        </section>
      ) : null}

      {step === "minutes" ? (
        <section>
          <h2 className="mb-4 text-3xl font-black text-stone-950">How many minutes?</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MINUTE_PRESETS.map((preset) => (
              <button
                className="min-h-24 rounded-lg border border-stone-200 bg-white text-4xl font-black text-stone-950 shadow-sm transition hover:border-supabase-border focus:outline-none focus:ring-4 focus:ring-supabase-100"
                key={preset}
                onClick={() => {
                  setMinutes(preset);
                  setStep("drills");
                }}
                type="button"
              >
                {preset}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === "drills" ? (
        <section className="grid gap-4">
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-2xl font-black text-stone-950">Drills done</h2>
            {drills.length === 0 ? (
              <p className="mt-2 text-base font-bold text-stone-600">
                No checklist for this one.
              </p>
            ) : (
              <div className="mt-4 grid gap-2">
                {drills.map((drill, index) => (
                  <button
                    className={classNames(
                      "flex min-h-14 items-center gap-3 rounded-lg border p-3 text-left text-base font-black transition",
                      drill.completed
                        ? "border-supabase-border bg-supabase-50 text-stone-950"
                        : "border-stone-200 bg-white text-stone-600",
                    )}
                    key={`${drill.label}-${index}`}
                    onClick={() =>
                      setDrills((current) =>
                        current.map((candidate, candidateIndex) =>
                          candidateIndex === index
                            ? { ...candidate, completed: !candidate.completed }
                            : candidate,
                        ),
                      )
                    }
                    type="button"
                  >
                    <span
                      className={classNames(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                        drill.completed
                          ? "border-supabase-border bg-supabase text-stone-950"
                          : "border-stone-300 bg-white",
                      )}
                    >
                      {drill.completed ? <Check className="h-5 w-5" /> : null}
                    </span>
                    {drill.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {player.handedness === "switch" ? (
            <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-xl font-black text-stone-950">Which side?</h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["L", "R", "both"] as const).map((side) => (
                  <button
                    className={classNames(
                      "min-h-12 rounded-lg border px-3 text-base font-black",
                      hittingSide === side
                        ? "border-sky-500 bg-sky-50 text-sky-950"
                        : "border-stone-200 bg-white text-stone-700",
                    )}
                    key={side}
                    onClick={() => setHittingSide(side)}
                    type="button"
                  >
                    {side === "both" ? "Both" : side}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black text-stone-950">How did it feel?</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FEELINGS.map((candidate) => (
                <button
                  className={classNames(
                    "min-h-12 rounded-lg border px-3 text-base font-black",
                    feeling === candidate
                      ? "border-rose-400 bg-rose-50 text-rose-950"
                      : "border-stone-200 bg-white text-stone-700",
                  )}
                  key={candidate}
                  onClick={() => setFeeling(candidate)}
                  type="button"
                >
                  {candidate}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black text-stone-950">Practice most</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {FOCUS_TAGS.map((candidate) => (
                <button
                  className={classNames(
                    "min-h-12 rounded-lg border px-3 text-left text-base font-black",
                    focusTag === candidate
                      ? "border-sky-400 bg-sky-50 text-sky-950"
                      : "border-stone-200 bg-white text-stone-700",
                  )}
                  key={candidate}
                  onClick={() => setFocusTag(candidate)}
                  type="button"
                >
                  {candidate}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-2 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <span className="text-xl font-black text-stone-950">Notes</span>
            <textarea
              className="min-h-24 rounded-lg border border-stone-200 p-3 text-base font-medium text-stone-950 outline-none focus:ring-4 focus:ring-supabase-100"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional"
              value={notes}
            />
          </label>

          <button
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-lg border border-supabase-border bg-supabase px-5 text-xl font-black text-stone-950 shadow-sm transition hover:bg-supabase-hover focus:outline-none focus:ring-4 focus:ring-supabase-100"
            onClick={submit}
            type="button"
          >
            <Heart className="h-7 w-7" />
            Save Practice
          </button>
        </section>
      ) : null}
    </main>
  );
}

export function HomeApp() {
  const [result, setResult] = useState<AppDataResult | null>(null);
  const [screen, setScreen] = useState<Screen>("picker");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    loadAppData()
      .then((loaded) => {
        if (mounted) {
          setResult(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (mounted) {
          setError(caught instanceof Error ? caught.message : "Could not load practice data.");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const syncQueuedSessions = useCallback(
    async (current: AppData) => {
      if (!result || result.mode !== "supabase" || !navigator.onLine) {
        return;
      }

      const queued = current.sessions.filter(
        (session) => session.sync_state === "queued" || session.sync_state === "error",
      );

      for (const queuedSession of queued) {
        try {
          const synced = await pushSessionToSupabase(queuedSession);
          setResult((previous) => {
            if (!previous) {
              return previous;
            }

            let nextData: AppData = {
              ...previous.data,
              sessions: previous.data.sessions.map((session) =>
                session.id === synced.id ? synced : session,
              ),
            };
            nextData = recomputeBadgesForPlayer(nextData, synced.player_id);
            persistLocalState(nextData, previous.mode);
            void replaceBadgesRemote(
              synced.player_id,
              nextData.playerBadges.filter((badge) => badge.player_id === synced.player_id),
            );

            return { ...previous, data: nextData };
          });
        } catch {
          setResult((previous) => {
            if (!previous) {
              return previous;
            }

            const nextData = {
              ...previous.data,
              sessions: previous.data.sessions.map((session) =>
                session.id === queuedSession.id
                  ? { ...session, sync_state: "error" as const }
                  : session,
              ),
            };
            persistLocalState(nextData, previous.mode);

            return { ...previous, data: nextData };
          });
        }
      }
    },
    [result],
  );

  useEffect(() => {
    if (!result) {
      return;
    }

    const sync = () => {
      window.setTimeout(() => void syncQueuedSessions(result.data), 0);
    };

    sync();
    window.addEventListener("online", sync);

    return () => {
      window.removeEventListener("online", sync);
    };
  }, [result, syncQueuedSessions]);

  const selectedPlayer = useMemo(
    () => result?.data.players.find((player) => player.id === selectedPlayerId) ?? null,
    [result, selectedPlayerId],
  );

  const handleSubmit = async (input: LogSessionInput) => {
    if (!result) {
      return;
    }

    const session = createPracticeSessionFromInput(input);
    const canTryRemote = result.mode === "supabase" && navigator.onLine;
    const optimisticSession: PracticeSession = {
      ...session,
      sync_state: canTryRemote ? "syncing" : "queued",
    };
    let nextData: AppData = {
      ...result.data,
      sessions: [optimisticSession, ...result.data.sessions],
    };

    nextData = recomputeBadgesForPlayer(nextData, input.player.id);
    setResult({ ...result, data: nextData });
    persistLocalState(nextData, result.mode);
    setScreen("dashboard");
    setMessage(
      input.require_parent_approval
        ? "Saved. A grown-up can approve it."
        : "Saved. Those minutes count right now.",
    );

    if (!canTryRemote) {
      return;
    }

    try {
      const synced = await pushSessionToSupabase(session);

      setResult((previous) => {
        if (!previous) {
          return previous;
        }

        let syncedData: AppData = {
          ...previous.data,
          sessions: previous.data.sessions.map((candidate) =>
            candidate.id === synced.id ? synced : candidate,
          ),
        };
        syncedData = recomputeBadgesForPlayer(syncedData, input.player.id);
        persistLocalState(syncedData, previous.mode);
        void replaceBadgesRemote(
          input.player.id,
          syncedData.playerBadges.filter((badge) => badge.player_id === input.player.id),
        );

        return { ...previous, data: syncedData };
      });
    } catch {
      setResult((previous) => {
        if (!previous) {
          return previous;
        }

        const queuedData = {
          ...previous.data,
          sessions: previous.data.sessions.map((candidate) =>
            candidate.id === session.id ? { ...candidate, sync_state: "error" as const } : candidate,
          ),
        };
        persistLocalState(queuedData, previous.mode);

        return { ...previous, data: queuedData };
      });
    }
  };

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-50 p-4">
        <section className="max-w-md rounded-lg border border-rose-200 bg-white p-6 text-center shadow-sm">
          <Frown className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="mt-3 text-2xl font-black text-stone-950">Practice board needs help</h1>
          <p className="mt-2 text-base font-bold text-stone-600">{error}</p>
        </section>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-50 p-4">
        <section className="rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm">
          <Sparkles className="mx-auto h-10 w-10 animate-pulse text-supabase-700" />
          <p className="mt-3 text-xl font-black text-stone-950">
            Warming up the practice board.
          </p>
        </section>
      </main>
    );
  }

  if (screen === "picker" || !selectedPlayer) {
    return (
      <PlayerPicker
        data={result.data}
        onPickPlayer={(playerId) => {
          setSelectedPlayerId(playerId);
          setMessage(null);
          setScreen("dashboard");
        }}
      />
    );
  }

  if (screen === "log") {
    return (
      <QuickLogFlow
        approvalRequired={result.data.settings.require_parent_approval}
        onCancel={() => setScreen("dashboard")}
        onSubmit={handleSubmit}
        player={selectedPlayer}
        templates={result.data.templates}
      />
    );
  }

  return (
    <PlayerDashboard
      data={result.data}
      message={message}
      onBack={() => {
        setScreen("picker");
        setSelectedPlayerId(null);
      }}
      onLogPractice={() => setScreen("log")}
      player={selectedPlayer}
    />
  );
}
