"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  CircleDot,
  Dumbbell,
  Frown,
  Gift,
  Heart,
  LayoutDashboard,
  Medal,
  Rocket,
  Sparkles,
  Star,
  Trophy,
  WifiOff,
} from "lucide-react";
import { HittingTrainingModule } from "@/components/hitting-training-module";
import { PitchingTrainingModule } from "@/components/pitching-training-module";
import { FEELINGS, MINUTE_PRESETS, SUMMER_REWARD_POINTS } from "@/lib/config";
import { parsePositiveIntegerInput } from "@/lib/input";
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
  getSummerRewardProgress,
  getWeeklyProgress,
} from "@/lib/progress";
import { formatShortDate, getAppDateKey } from "@/lib/time";
import type {
  AppData,
  AppDataResult,
  DrillTemplate,
  HittingSide,
  LogSessionInput,
  Player,
  PlayerSport,
  PracticeSession,
  Sport,
} from "@/lib/types";

type Screen = "picker" | "dashboard" | "log" | "hitting" | "pitching";

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function ProgressBar({
  value,
  tone = "green",
  label = "Progress",
}: {
  value: number;
  tone?: "green" | "blue";
  label?: string;
}) {
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.min(100, Math.max(0, value))}
      className="h-4 w-full overflow-hidden rounded-full bg-stone-200"
      role="progressbar"
    >
      <div
        className={classNames(
          "h-full rounded-full transition-all",
          tone === "green" ? "bg-violet-500" : "bg-sky-500",
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function SummerRewardCard({
  player,
  sessions,
  compact = false,
}: {
  player: Player;
  sessions: PracticeSession[];
  compact?: boolean;
}) {
  const reward = getSummerRewardProgress(player, sessions, getAppDateKey());

  if (compact) {
    return (
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm font-black text-slate-600">
          <span className="flex items-center gap-1.5">
            <Gift className="h-4 w-4 text-violet-600" />
            {SUMMER_REWARD_POINTS.toLocaleString()}-point goal
          </span>
          <span>{reward.percent}%</span>
        </div>
        <div
          aria-label={`${player.name}'s summer reward progress`}
          aria-valuemax={reward.goalMinutes}
          aria-valuemin={0}
          aria-valuenow={Math.min(reward.minutes, reward.goalMinutes)}
          className="h-3 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-400 transition-all"
            style={{ width: `${reward.percent}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-bold text-slate-500">
          {reward.minutes} of {reward.goalMinutes} minutes
        </p>
      </div>
    );
  }

  const countdownText = reward.met
    ? "Goal reached"
    : reward.ended
      ? `Goal day was ${formatShortDate(reward.endDate)}`
      : reward.daysRemaining === 0
        ? "Goal day is today"
        : `${reward.daysRemaining} days to Aug 9`;

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-6 text-white shadow-xl shadow-fuchsia-200/50 sm:p-8">
      <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full border-[30px] border-white/10" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
              <Gift className="h-8 w-8" />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-violet-100">
                Summer reward challenge
              </p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">
                {SUMMER_REWARD_POINTS.toLocaleString()} points
              </h2>
            </div>
          </div>
          <span className="rounded-full bg-slate-950/20 px-3 py-1.5 text-sm font-black text-white/90 backdrop-blur">
            {countdownText}
          </span>
        </div>

        <div className="mt-7 flex items-end justify-between gap-4">
          <p className="text-xl font-black sm:text-2xl">
            {reward.met ? "You unlocked it!" : `${reward.remaining} minutes to go`}
          </p>
          <p className="text-sm font-black text-white/90">
            {reward.minutes} / {reward.goalMinutes} min
          </p>
        </div>
        <div
          aria-label={`${player.name}'s summer reward progress`}
          aria-valuemax={reward.goalMinutes}
          aria-valuemin={0}
          aria-valuenow={Math.min(reward.minutes, reward.goalMinutes)}
          className="mt-3 h-6 overflow-hidden rounded-full border-4 border-white/20 bg-slate-950/20 shadow-inner"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-200 to-yellow-300 transition-all"
            style={{ width: `${reward.percent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-white/80">
          <span>Start</span>
          <span>{reward.percent}%</span>
          <span>Reward</span>
        </div>

        <p className="mt-5 max-w-2xl rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold text-white/95 backdrop-blur">
          When the bar is full, a parent will add {SUMMER_REWARD_POINTS.toLocaleString()} points
          to the Family Rewards app. Approved practice minutes count toward the goal.
        </p>
      </div>
    </section>
  );
}

function StatusNote({
  mode,
  sessions,
}: {
  mode: AppDataResult["mode"];
  sessions: PracticeSession[];
}) {
  const unsyncedCount = sessions.filter(
    (session) => session.sync_state && session.sync_state !== "synced",
  ).length;

  if (unsyncedCount > 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900">
        <WifiOff className="h-4 w-4" />
        {mode === "local"
          ? `Supabase is not connected. ${unsyncedCount} saved only on this device.`
          : `${unsyncedCount} saved on this device and waiting to sync.`}
      </div>
    );
  }

  return null;
}

function PlayerPicker({
  data,
  mode,
  onOpenHitting,
  onOpenPitching,
  onPickPlayer,
}: {
  data: AppData;
  mode: AppDataResult["mode"];
  onOpenHitting: () => void;
  onOpenPitching: () => void;
  onPickPlayer: (playerId: string) => void;
}) {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,_#ede9fe_0,_#f8fafc_38%,_#f8fafc_100%)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-5 sm:px-6 sm:py-8">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-violet-600">
            <Star className="h-5 w-5 fill-current" />
            Summer Training Club
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
            Who&apos;s practicing?
          </h1>
          <p className="mt-2 text-lg font-bold text-slate-600">
            Pick your name, then choose your next move.
          </p>
        </div>
        <Link
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-violet-100"
          href="/parent"
        >
          <LayoutDashboard className="h-5 w-5" />
          Parent Dashboard
        </Link>
      </header>

      <div className="mb-4">
        <StatusNote mode={mode} sessions={data.sessions} />
      </div>

      <section aria-label="Training guides" className="mb-5 grid gap-3 sm:grid-cols-2">
        <button
          className="group flex min-h-24 items-center justify-between rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-left text-white shadow-lg shadow-indigo-200/50 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-200"
          onClick={onOpenPitching}
          type="button"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <CircleDot className="h-7 w-7" />
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-wide text-indigo-100">
                New
              </span>
              <span className="block text-2xl font-black">Pitching Guide</span>
            </span>
          </span>
          <ChevronRight className="h-7 w-7 transition group-hover:translate-x-1" />
        </button>
        <button
          className="group flex min-h-24 items-center justify-between rounded-3xl bg-gradient-to-br from-cyan-500 to-sky-500 p-5 text-left text-white shadow-lg shadow-sky-200/50 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-sky-200"
          onClick={onOpenHitting}
          type="button"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <BookOpen className="h-7 w-7" />
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-wide text-sky-100">
                Learn & practice
              </span>
              <span className="block text-2xl font-black">Hitting Guide</span>
            </span>
          </span>
          <ChevronRight className="h-7 w-7 transition group-hover:translate-x-1" />
        </button>
      </section>

      {data.players.length === 0 ? (
        <section className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Trophy className="mb-4 h-12 w-12 text-violet-600" />
          <h2 className="text-2xl font-black text-slate-950">Ready for athletes</h2>
          <p className="mt-2 max-w-md text-lg font-medium text-slate-600">
            Ask a parent to add athlete cards.
          </p>
        </section>
      ) : (
        <section className="grid flex-1 content-start gap-4 sm:grid-cols-2">
          {data.players.map((player) => {
            const today = getAppDateKey();
            const weekly = getWeeklyProgress(player, data.sessions, today);
            const pendingMinutes = getPendingMinutes(data.sessions, player.id);
            const sportNames = data.playerSports
              .filter((assignment) => assignment.player_id === player.id)
              .map((assignment) => data.sports.find((sport) => sport.id === assignment.sport_id)?.name)
              .filter((name): name is string => Boolean(name));

            return (
              <button
                className="group min-h-64 rounded-[2rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/70 focus:outline-none focus:ring-4 focus:ring-violet-100"
                key={player.id}
                onClick={() => onPickPlayer(player.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-3xl font-black text-violet-700">
                      {player.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                    <h2 className="text-4xl font-black text-slate-950">{player.name}</h2>
                    <p className="mt-1 text-base font-bold text-slate-500">
                      {sportNames.length > 0 ? sportNames.join(", ") : "No sports assigned yet"}
                    </p>
                    </div>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-violet-600 transition group-hover:translate-x-1 group-hover:bg-violet-50">
                    <ChevronRight className="h-6 w-6" />
                  </span>
                </div>
                <SummerRewardCard compact player={player} sessions={data.sessions} />
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">
                  <span>{weekly.minutes} minutes this week</span>
                  <span className="text-violet-700">
                    {pendingMinutes > 0 ? `${pendingMinutes} waiting` : "Tap to open"}
                  </span>
                </div>
              </button>
            );
          })}
        </section>
      )}
      </div>
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
  mode,
  player,
  message,
  onBack,
  onOpenHitting,
  onOpenPitching,
  onLogPractice,
}: {
  data: AppData;
  mode: AppDataResult["mode"];
  player: Player;
  message: string | null;
  onBack: () => void;
  onOpenHitting: () => void;
  onOpenPitching: () => void;
  onLogPractice: () => void;
}) {
  const today = getAppDateKey();
  const weekly = getWeeklyProgress(player, data.sessions, today);
  const pendingMinutes = getPendingMinutes(data.sessions, player.id);
  const rejectedCount = getRejectedCount(data.sessions, player.id);

  // ASSUMPTION: Ages are not confirmed, so kid-facing copy stays short with oversized controls for younger elementary readers.
  // ASSUMPTION: Rejected sessions do not interrupt the child flow; the dashboard only says they need another try.
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,_#ede9fe_0,_#f8fafc_38%,_#f8fafc_100%)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <button
          aria-label="Choose a different athlete"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-violet-100"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-violet-100"
          href="/parent"
        >
          <LayoutDashboard className="h-5 w-5" />
          Parent Dashboard
        </Link>
      </header>

      <section className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-violet-600">
          <Rocket className="h-5 w-5" />
          Your practice home
        </p>
        <h1 className="mt-2 text-5xl font-black tracking-tight text-slate-950 sm:text-7xl">
          Hi, {player.name}!
        </h1>
        <p className="mt-3 max-w-2xl text-lg font-bold text-slate-600">
          Ready for a few strong minutes? Every practice moves your summer bar.
        </p>
        {message ? (
          <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-lg font-black text-emerald-900">
            {message}
          </p>
        ) : null}
      </section>

      <div className="mt-4">
        <StatusNote mode={mode} sessions={data.sessions} />
      </div>

      <section className="mt-4">
        <SummerRewardCard player={player} sessions={data.sessions} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
              <Clock className="h-6 w-6" />
            </span>
            <h2 className="text-xl font-black text-slate-950">This week</h2>
          </div>
          <p className="mt-5 text-4xl font-black text-slate-950">
            {weekly.minutes} minutes
          </p>
          <p className="mt-2 text-lg font-bold text-slate-600">
            {weekly.met
              ? "Weekly goal crushed. Nice work!"
              : `${weekly.remaining} more minutes reaches your weekly goal.`}
          </p>
          <div className="mt-5">
            <ProgressBar label="Weekly practice progress" value={weekly.percent} />
          </div>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">
            Practice status
          </p>
          <p className="mt-3 text-2xl font-black">
            {pendingMinutes > 0
              ? `${pendingMinutes} minutes waiting for a parent to approve.`
              : "All caught up!"}
          </p>
          {rejectedCount > 0 ? (
            <p className="mt-3 text-sm font-bold text-amber-200">
              {rejectedCount} practice {rejectedCount === 1 ? "needs" : "need"} another try.
            </p>
          ) : (
            <p className="mt-3 text-sm font-bold text-slate-300">
              Approved minutes fill the summer reward bar.
            </p>
          )}
        </div>
      </section>

      <section aria-label="What do you want to do?" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          className="group flex min-h-24 w-full items-center justify-between rounded-3xl bg-slate-950 px-5 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-violet-200 sm:col-span-2 lg:col-span-1"
          onClick={onLogPractice}
          type="button"
        >
          <span className="flex items-center gap-3">
            <Dumbbell className="h-8 w-8" />
            <span className="text-2xl font-black">Log Practice</span>
          </span>
          <ChevronRight className="h-7 w-7 transition group-hover:translate-x-1" />
        </button>
        <button
          className="group flex min-h-24 w-full items-center justify-between rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 text-left text-white shadow-lg shadow-indigo-200/50 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-200"
          onClick={onOpenPitching}
          type="button"
        >
          <span className="flex items-center gap-3">
            <CircleDot className="h-8 w-8" />
            <span className="text-2xl font-black">Pitching</span>
          </span>
          <ChevronRight className="h-7 w-7 transition group-hover:translate-x-1" />
        </button>
        <button
          className="group flex min-h-24 w-full items-center justify-between rounded-3xl bg-gradient-to-br from-cyan-500 to-sky-500 px-5 text-left text-white shadow-lg shadow-sky-200/50 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-sky-200"
          onClick={onOpenHitting}
          type="button"
        >
          <span className="flex items-center gap-3">
            <BookOpen className="h-8 w-8" />
            <span className="text-2xl font-black">Hitting</span>
          </span>
          <ChevronRight className="h-7 w-7 transition group-hover:translate-x-1" />
        </button>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Medal className="h-6 w-6 text-amber-500" />
          <h2 className="text-xl font-black text-slate-950">Trophy shelf</h2>
        </div>
        <BadgeStrip data={data} player={player} />
      </section>
      </div>
    </main>
  );
}

function QuickLogFlow({
  player,
  sports,
  playerSports,
  templates,
  approvalRequired,
  onCancel,
  onSubmit,
}: {
  player: Player;
  sports: Sport[];
  playerSports: PlayerSport[];
  templates: DrillTemplate[];
  approvalRequired: boolean;
  onCancel: () => void;
  onSubmit: (input: LogSessionInput) => void;
}) {
  const availableSports = sports.filter((sport) =>
    playerSports.some(
      (assignment) => assignment.player_id === player.id && assignment.sport_id === sport.id,
    ),
  );
  const onlySport = availableSports.length === 1 ? availableSports[0] : null;
  const [step, setStep] = useState<"sport" | "type" | "minutes" | "drills">(
    onlySport ? "type" : "sport",
  );
  const [sportId, setSportId] = useState<string | null>(onlySport?.id ?? null);
  const [practiceType, setPracticeType] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [customMinutesInput, setCustomMinutesInput] = useState("");
  const [drills, setDrills] = useState<Array<{ label: string; completed: boolean }>>([]);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [hittingSide, setHittingSide] = useState<HittingSide | null>(null);
  const [sessionDate, setSessionDate] = useState(() => getAppDateKey());

  const selectedSport = sports.find((sport) => sport.id === sportId) ?? null;
  const availableTemplates = templates.filter((template) => template.sport_id === sportId);
  const customMinutes = parsePositiveIntegerInput(customMinutesInput);

  const selectSport = (sport: Sport) => {
    setSportId(sport.id);
    setStep("type");
  };

  const selectTemplate = (template: DrillTemplate) => {
    setPracticeType(template.practice_type);
    setDrills(
      (template?.items ?? []).map((item) => ({
        label: item.label,
        completed: true,
      })),
    );
    setStep("minutes");
  };

  const submit = () => {
    if (!sportId || !practiceType || !minutes) {
      return;
    }

    onSubmit({
      player,
      sport_id: sportId,
      practice_type: practiceType,
      minutes,
      drills,
      feeling,
      notes: notes.trim() ? notes.trim() : null,
      hitting_side: hittingSide,
      session_date: sessionDate,
      require_parent_approval: approvalRequired,
    });
  };

  const continueWithCustomMinutes = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!customMinutes) {
      return;
    }

    setMinutes(customMinutes);
    setStep("drills");
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
          <p className="text-sm font-bold uppercase tracking-wide text-violet-700">
            {player.name}
          </p>
          <h1 className="text-2xl font-black text-stone-950 sm:text-4xl">
            Log practice
          </h1>
        </div>
      </header>

      {step === "sport" ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {availableSports.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 sm:col-span-2">
              <h2 className="text-2xl font-black text-stone-950">No sports assigned yet</h2>
              <p className="mt-2 font-bold text-stone-600">
                Ask a parent to choose sports for {player.name} in the dashboard.
              </p>
            </div>
          ) : (
            availableSports.map((sport) => (
              <button
                className="flex min-h-24 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100"
                key={sport.id}
                onClick={() => selectSport(sport)}
                type="button"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <span className="text-lg font-black">{sport.icon}</span>
                </span>
                <span className="text-2xl font-black text-stone-950">{sport.name}</span>
              </button>
            ))
          )}
        </section>
      ) : null}

      {step === "type" ? (
        <section>
          <p className="mb-2 text-sm font-black uppercase tracking-wide text-violet-700">
            {selectedSport?.name}
          </p>
          <h2 className="mb-4 text-3xl font-black text-stone-950">Choose a practice plan</h2>
          {availableTemplates.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <p className="font-bold text-stone-700">
                A parent needs to add a practice plan for this sport first.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {availableTemplates.map((template) => (
                <button
                  className="flex min-h-24 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100"
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  type="button"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <Dumbbell className="h-8 w-8" />
                  </span>
                  <span>
                    <span className="block text-2xl font-black text-stone-950">
                      {template.practice_type}
                    </span>
                    <span className="font-bold text-stone-500">{template.name}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {step === "minutes" ? (
        <section>
          <h2 className="mb-4 text-3xl font-black text-stone-950">How many minutes?</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MINUTE_PRESETS.map((preset) => (
              <button
                className="min-h-24 rounded-2xl border border-slate-200 bg-white text-4xl font-black text-stone-950 shadow-sm transition hover:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100"
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
          <form
            className="mt-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
            onSubmit={continueWithCustomMinutes}
          >
            <label className="grid gap-2">
              <span className="text-xl font-black text-stone-950">Custom minutes</span>
              <span className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  aria-invalid={customMinutesInput.trim() !== "" && !customMinutes}
                  className="min-h-12 rounded-xl border border-slate-200 px-3 text-base font-bold text-stone-950 outline-none focus:ring-4 focus:ring-violet-100"
                  inputMode="numeric"
                  min={1}
                  onChange={(event) => setCustomMinutesInput(event.target.value)}
                  placeholder="80"
                  step={1}
                  type="number"
                  value={customMinutesInput}
                />
                <button
                  className="flex min-h-12 items-center justify-center rounded-xl bg-violet-600 px-5 font-black text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!customMinutes}
                  type="submit"
                >
                  Continue
                </button>
              </span>
            </label>
          </form>
        </section>
      ) : null}

      {step === "drills" ? (
        <section className="grid gap-4">
          <label className="grid gap-2 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <span className="text-xl font-black text-stone-950">Practice date</span>
            <input
              className="min-h-12 rounded-xl border border-slate-200 px-3 text-base font-bold text-stone-950 outline-none focus:ring-4 focus:ring-violet-100"
              onChange={(event) => setSessionDate(event.target.value)}
              required
              type="date"
              value={sessionDate}
            />
          </label>

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
                        ? "border-violet-300 bg-violet-50 text-violet-950"
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
                          ? "border-violet-600 bg-violet-600 text-white"
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

          {player.handedness === "switch" &&
          ["softball", "baseball"].some((name) =>
            selectedSport?.name.toLowerCase().includes(name),
          ) ? (
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

          <label className="grid gap-2 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <span className="text-xl font-black text-stone-950">Notes</span>
            <textarea
              className="min-h-24 rounded-xl border border-slate-200 p-3 text-base font-medium text-stone-950 outline-none focus:ring-4 focus:ring-violet-100"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional"
              value={notes}
            />
          </label>

          <button
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 text-xl font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200"
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

export function HomeApp({ initialScreen = "picker" }: { initialScreen?: Screen } = {}) {
  const [result, setResult] = useState<AppDataResult | null>(null);
  const [screen, setScreen] = useState<Screen>(initialScreen);
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
          setError(getErrorMessage(caught, "Could not load practice data."));
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
    setSelectedPlayerId(input.player.id);
    setScreen("dashboard");
    setMessage(
      input.require_parent_approval
        ? "Saved. A parent can approve it."
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
          <Sparkles className="mx-auto h-10 w-10 animate-pulse text-violet-600" />
          <p className="mt-3 text-xl font-black text-stone-950">
            Warming up the practice board.
          </p>
        </section>
      </main>
    );
  }

  if (screen === "picker" || !selectedPlayer) {
    if (screen === "hitting") {
      return (
        <HittingTrainingModule
          data={result.data}
          onBack={() => setScreen("picker")}
          onSelectPlayer={(playerId) => setSelectedPlayerId(playerId)}
          onSubmit={handleSubmit}
          selectedPlayer={selectedPlayer}
        />
      );
    }

    if (screen === "pitching") {
      return (
        <PitchingTrainingModule
          data={result.data}
          onBack={() => setScreen("picker")}
          onSelectPlayer={(playerId) => setSelectedPlayerId(playerId)}
          onSubmit={handleSubmit}
          selectedPlayer={selectedPlayer}
        />
      );
    }

    return (
      <PlayerPicker
        data={result.data}
        mode={result.mode}
        onOpenHitting={() => {
          setSelectedPlayerId(result.data.players[0]?.id ?? null);
          setMessage(null);
          setScreen("hitting");
        }}
        onOpenPitching={() => {
          setSelectedPlayerId(result.data.players[0]?.id ?? null);
          setMessage(null);
          setScreen("pitching");
        }}
        onPickPlayer={(playerId) => {
          setSelectedPlayerId(playerId);
          setMessage(null);
          setScreen("dashboard");
        }}
      />
    );
  }

  if (screen === "hitting") {
    return (
      <HittingTrainingModule
        data={result.data}
        onBack={() => setScreen("dashboard")}
        onSelectPlayer={(playerId) => setSelectedPlayerId(playerId)}
        onSubmit={handleSubmit}
        selectedPlayer={selectedPlayer}
      />
    );
  }

  if (screen === "pitching") {
    return (
      <PitchingTrainingModule
        data={result.data}
        onBack={() => setScreen("dashboard")}
        onSelectPlayer={(playerId) => setSelectedPlayerId(playerId)}
        onSubmit={handleSubmit}
        selectedPlayer={selectedPlayer}
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
        playerSports={result.data.playerSports}
        sports={result.data.sports}
        templates={result.data.templates}
      />
    );
  }

  return (
    <PlayerDashboard
      data={result.data}
      message={message}
      mode={result.mode}
      onBack={() => {
        setScreen("picker");
        setSelectedPlayerId(null);
      }}
      onOpenHitting={() => setScreen("hitting")}
      onOpenPitching={() => setScreen("pitching")}
      onLogPractice={() => setScreen("log")}
      player={selectedPlayer}
    />
  );
}
