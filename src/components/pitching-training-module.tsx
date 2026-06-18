"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  ExternalLink,
  Heart,
  NotebookPen,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trophy,
  UserRound,
  Video,
  Zap,
} from "lucide-react";
import { FEELINGS } from "@/lib/config";
import { parsePositiveIntegerInput } from "@/lib/input";
import {
  PITCHING_ADVICE,
  PITCHING_CHAIN_STEPS,
  PITCHING_DRILLS,
  PITCHING_PRACTICE_PLANS,
  PITCHING_VIDEO_RESEARCH_DATE,
  PITCHING_VIDEOS,
} from "@/lib/pitching-training";
import { getMaxStreak } from "@/lib/progress";
import { getAppDateKey, getWeekKey } from "@/lib/time";
import type { AppData, LogSessionInput, Player, PracticeSession } from "@/lib/types";

type PitchingTab = "start" | "drills" | "videos" | "log";

const SOFTBALL_SPORT_ID = "10000000-0000-4000-8000-000000000001";
const MINUTE_OPTIONS = [10, 15, 20, 30] as const;

const TABS: Array<{
  id: PitchingTab;
  label: string;
  icon: typeof BookOpen;
}> = [
  { id: "start", label: "Start Here", icon: BookOpen },
  { id: "drills", label: "Drills", icon: Target },
  { id: "videos", label: "Top Videos", icon: Video },
  { id: "log", label: "Log Practice", icon: NotebookPen },
];

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

function isPitchingSession(session: PracticeSession) {
  const text = [
    session.practice_type,
    session.notes ?? "",
    ...session.drills.map((drill) => drill.drill_label),
  ]
    .join(" ")
    .toLowerCase();

  return ["pitch", "power-line", "power-k", "walk-through", "target game"].some(
    (keyword) => text.includes(keyword),
  );
}

function formatViews(views: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(views);
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-indigo-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

export function PitchingTrainingModule({
  data,
  selectedPlayer,
  onBack,
  onSelectPlayer,
  onSubmit,
}: {
  data: AppData;
  selectedPlayer: Player | null;
  onBack: () => void;
  onSelectPlayer: (playerId: string) => void;
  onSubmit: (input: LogSessionInput) => void;
}) {
  const [activeTab, setActiveTab] = useState<PitchingTab>("start");
  const [minutesInput, setMinutesInput] = useState("20");
  const [sessionDate, setSessionDate] = useState(() => getAppDateKey());
  const [selectedDrills, setSelectedDrills] = useState<string[]>([
    PITCHING_DRILLS[0].name,
    PITCHING_DRILLS[1].name,
    PITCHING_DRILLS[3].name,
  ]);
  const [feeling, setFeeling] = useState<string | null>("Good");
  const [notes, setNotes] = useState("");

  const activePlayer = selectedPlayer ?? data.players[0] ?? null;
  const softballSport =
    data.sports.find((sport) => sport.name.toLowerCase().includes("softball")) ??
    data.sports.find((sport) => sport.id === SOFTBALL_SPORT_ID) ??
    null;
  const minutes = parsePositiveIntegerInput(minutesInput);
  const today = getAppDateKey();
  const currentWeek = getWeekKey(today);
  const playerSessions = activePlayer
    ? data.sessions.filter((session) => session.player_id === activePlayer.id)
    : [];
  const pitchingSessions = playerSessions.filter(isPitchingSession);
  const pitchingThisWeek = pitchingSessions.filter(
    (session) =>
      session.status !== "rejected" && getWeekKey(session.session_date) === currentWeek,
  );
  const pitchingMinutesThisWeek = pitchingThisWeek.reduce(
    (sum, session) => sum + session.minutes,
    0,
  );
  const totalPitchingMinutes = pitchingSessions
    .filter((session) => session.status !== "rejected")
    .reduce((sum, session) => sum + session.minutes, 0);
  const bestStreak = activePlayer ? getMaxStreak(activePlayer.id, data.sessions) : 0;

  const submitLog = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activePlayer || !softballSport || !minutes) {
      return;
    }

    const noteLines = [
      selectedDrills.length > 0 ? `Pitching drills: ${selectedDrills.join(", ")}` : null,
      notes.trim() ? `Pitching notes: ${notes.trim()}` : null,
    ].filter((line): line is string => Boolean(line));

    onSubmit({
      player: activePlayer,
      sport_id: softballSport.id,
      practice_type: "Pitching Practice",
      minutes,
      drills: selectedDrills.map((label) => ({ label, completed: true })),
      feeling,
      notes: noteLines.join("\n"),
      hitting_side: null,
      session_date: sessionDate,
      require_parent_approval: data.settings.require_parent_approval,
    });
  };

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,_#e0e7ff_0,_#f8fafc_38%,_#f8fafc_100%)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-3">
          <button
            aria-label="Go back"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-100"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-white px-4 font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            href="/parent"
          >
            <UserRound className="h-5 w-5" />
            Parent Dashboard
          </Link>
        </header>

        <section className="relative mt-4 overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-6 text-white shadow-xl shadow-indigo-200/60 sm:p-8">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border-[28px] border-white/10" />
          <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative max-w-3xl">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-indigo-100">
              <CircleDot className="h-5 w-5" />
              Softball pitching guide
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">
              Strong motion. Brave throws. Better strikes.
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-bold text-indigo-50 sm:text-xl">
              Learn one cue, try one drill, and log the minutes. Accuracy first—speed can
              grow later.
            </p>
          </div>
        </section>

        <section className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm">
            <p className="mb-2 px-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Who is practicing?
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.players.map((player) => (
                <button
                  className={classNames(
                    "flex min-h-14 items-center justify-between rounded-xl border px-4 text-left font-black transition focus:outline-none focus:ring-4 focus:ring-indigo-100",
                    activePlayer?.id === player.id
                      ? "border-indigo-300 bg-indigo-50 text-indigo-950"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200",
                  )}
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                  type="button"
                >
                  <span>{player.name}</span>
                  {activePlayer?.id === player.id ? <Check className="h-5 w-5" /> : null}
                </button>
              ))}
            </div>
          </div>

          <button
            className="group flex min-h-24 items-center justify-between rounded-2xl bg-amber-300 p-4 text-left text-amber-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-200 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-amber-100"
            onClick={() => setActiveTab("log")}
            type="button"
          >
            <span>
              <span className="block text-xs font-black uppercase tracking-[0.14em]">
                Finished practicing?
              </span>
              <span className="mt-1 block text-xl font-black">Log it now</span>
            </span>
            <ChevronRight className="h-7 w-7 transition group-hover:translate-x-1" />
          </button>
        </section>

        {activePlayer ? (
          <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Clock3}
              label="This week"
              value={`${pitchingMinutesThisWeek} min`}
            />
            <StatCard
              icon={Target}
              label="Sessions"
              value={`${pitchingThisWeek.length}`}
            />
            <StatCard
              icon={Timer}
              label="All pitching"
              value={`${totalPitchingMinutes} min`}
            />
            <StatCard icon={Zap} label="Best streak" value={`${bestStreak} days`} />
          </section>
        ) : null}

        <nav
          aria-label="Pitching guide sections"
          className="sticky top-0 z-10 -mx-4 mt-4 overflow-x-auto border-y border-indigo-100 bg-slate-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border"
        >
          <div className="flex min-w-max gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  className={classNames(
                    "flex min-h-12 items-center gap-2 rounded-xl border px-4 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-indigo-100",
                    activeTab === tab.id
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200",
                  )}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {activeTab === "start" ? (
          <section className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-1 h-7 w-7 shrink-0 text-violet-500" />
                <div>
                  <h2 className="text-2xl font-black text-slate-950">The 6-part pitch</h2>
                  <p className="mt-1 font-bold text-slate-600">
                    You do not need six thoughts at once. Pick one card for today.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {PITCHING_CHAIN_STEPS.map((step, index) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  key={step.id}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-lg font-black text-indigo-700">
                      {index + 1}
                    </span>
                    <h3 className="text-xl font-black text-slate-950">{step.title}</h3>
                  </div>
                  <p className="mt-4 text-lg font-black text-indigo-700">{step.cue}</p>
                  <p className="mt-2 font-bold leading-relaxed text-slate-600">{step.detail}</p>
                </article>
              ))}
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-7 w-7 text-emerald-700" />
                <h2 className="text-2xl font-black text-emerald-950">Pitch smart & safe</h2>
              </div>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {PITCHING_ADVICE.map((tip) => (
                  <li className="flex gap-2 font-bold text-emerald-900" key={tip}>
                    <Check className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {activeTab === "drills" ? (
          <section className="mt-4 grid gap-5">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-indigo-600">
                Pick 2 or 3
              </p>
              <h2 className="mt-1 text-3xl font-black text-slate-950">Pitching drills</h2>
              <p className="mt-2 max-w-2xl font-bold text-slate-600">
                Clean reps beat tired reps. Stop while the motion still feels strong.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {PITCHING_DRILLS.map((drill) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  key={drill.name}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-500">
                        {drill.focus}
                      </p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">{drill.name}</h3>
                    </div>
                    <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                      {drill.time}
                    </span>
                  </div>
                  <p className="mt-4 font-bold leading-relaxed text-slate-600">{drill.how}</p>
                  <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-black text-amber-900">
                    ⭐ {drill.challenge}
                  </p>
                </article>
              ))}
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
              <h2 className="text-2xl font-black text-indigo-950">Choose a practice size</h2>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {PITCHING_PRACTICE_PLANS.map((plan) => (
                  <button
                    className="group rounded-2xl border border-indigo-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    key={plan.title}
                    onClick={() => {
                      setMinutesInput(String(plan.minutes));
                      setActiveTab("log");
                    }}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-xl font-black text-slate-950">{plan.title}</span>
                      <ChevronRight className="h-5 w-5 text-indigo-500 transition group-hover:translate-x-1" />
                    </span>
                    <span className="mt-3 block font-bold text-slate-600">{plan.plan}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "videos" ? (
          <section className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
              <h2 className="text-3xl font-black text-slate-950">10 most-viewed pitching guides</h2>
              <p className="mt-2 font-bold text-slate-600">
                Ranked by public YouTube views checked {PITCHING_VIDEO_RESEARCH_DATE}. View
                counts change over time. Watch with a parent and follow your coach’s cues.
              </p>
            </div>
            <ol className="grid gap-3 md:grid-cols-2">
              {PITCHING_VIDEOS.map((video, index) => (
                <li key={video.id}>
                  <a
                    className="group flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-lg font-black text-rose-700">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-black leading-snug text-slate-950 group-hover:text-indigo-700">
                        {video.title}
                      </span>
                      <span className="mt-2 block text-sm font-bold text-slate-500">
                        {video.channel} · {video.duration} · {formatViews(video.views)} views
                      </span>
                      <span className="mt-3 flex items-center gap-2 text-sm font-black text-indigo-700">
                        <PlayCircle className="h-5 w-5" />
                        {video.focus}
                        <ExternalLink className="h-4 w-4" />
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {activeTab === "log" ? (
          <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <form
              className="grid gap-5 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6"
              onSubmit={submitLog}
            >
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-indigo-600">
                  Nice work, {activePlayer?.name ?? "pitcher"}
                </p>
                <h2 className="mt-1 text-3xl font-black text-slate-950">Log pitching practice</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="font-black text-slate-950">Date</span>
                  <input
                    className="min-h-12 rounded-xl border border-slate-200 px-3 font-bold text-slate-950 outline-none focus:ring-4 focus:ring-indigo-100"
                    onChange={(event) => setSessionDate(event.target.value)}
                    required
                    type="date"
                    value={sessionDate}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="font-black text-slate-950">Minutes</span>
                  <input
                    aria-invalid={minutesInput.trim() !== "" && !minutes}
                    className="min-h-12 rounded-xl border border-slate-200 px-3 font-bold text-slate-950 outline-none focus:ring-4 focus:ring-indigo-100"
                    inputMode="numeric"
                    min={1}
                    onChange={(event) => setMinutesInput(event.target.value)}
                    required
                    step={1}
                    type="number"
                    value={minutesInput}
                  />
                </label>
              </div>

              <fieldset>
                <legend className="font-black text-slate-950">Quick minutes</legend>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {MINUTE_OPTIONS.map((option) => (
                    <button
                      className={classNames(
                        "min-h-12 rounded-xl border text-lg font-black transition focus:outline-none focus:ring-4 focus:ring-indigo-100",
                        minutesInput === String(option)
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200",
                      )}
                      key={option}
                      onClick={() => setMinutesInput(String(option))}
                      type="button"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="font-black text-slate-950">What did you practice?</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {PITCHING_DRILLS.map((drill) => (
                    <button
                      className={classNames(
                        "flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-indigo-100",
                        selectedDrills.includes(drill.name)
                          ? "border-indigo-300 bg-indigo-50 text-indigo-950"
                          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200",
                      )}
                      key={drill.name}
                      onClick={() =>
                        setSelectedDrills((current) => toggleValue(current, drill.name))
                      }
                      type="button"
                    >
                      <span
                        className={classNames(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                          selectedDrills.includes(drill.name)
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-300 bg-white",
                        )}
                      >
                        {selectedDrills.includes(drill.name) ? (
                          <Check className="h-4 w-4" />
                        ) : null}
                      </span>
                      {drill.name}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="font-black text-slate-950">How did it feel?</legend>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {FEELINGS.map((candidate) => (
                    <button
                      className={classNames(
                        "min-h-12 rounded-xl border px-3 font-black transition focus:outline-none focus:ring-4 focus:ring-rose-100",
                        feeling === candidate
                          ? "border-rose-300 bg-rose-50 text-rose-950"
                          : "border-slate-200 bg-white text-slate-700",
                      )}
                      key={candidate}
                      onClick={() => setFeeling(candidate)}
                      type="button"
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="grid gap-2">
                <span className="font-black text-slate-950">One thing I noticed</span>
                <textarea
                  className="min-h-24 rounded-xl border border-slate-200 p-3 font-medium text-slate-950 outline-none focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="My stride stayed straight, or I hit 6 out of 12 targets."
                  value={notes}
                />
              </label>

              <button
                className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 text-xl font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!activePlayer || !softballSport || !minutes}
                type="submit"
              >
                <Heart className="h-6 w-6" />
                Save My Practice
              </button>
            </form>

            <aside className="grid content-start gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-amber-300 to-orange-300 p-5 text-amber-950 shadow-sm">
                <Trophy className="h-7 w-7" />
                <p className="mt-3 text-xl font-black">Every logged minute moves the reward bar.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-black text-slate-950">Your pitching total</h3>
                <p className="mt-2 text-3xl font-black text-indigo-700">
                  {totalPitchingMinutes} min
                </p>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  {data.settings.require_parent_approval
                    ? "A parent approves the session before it counts toward the summer goal."
                    : "Saved sessions count toward the summer goal right away."}
                </p>
              </div>
            </aside>
          </section>
        ) : null}
      </div>
    </main>
  );
}
