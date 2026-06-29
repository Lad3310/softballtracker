"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Flame,
  NotebookPen,
  PlayCircle,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Video,
  Zap,
} from "lucide-react";
import { FEELINGS } from "@/lib/config";
import {
  ANALYSIS_AREAS,
  ANALYSIS_STRENGTHS,
  ANAMARIE_BRUNI_TEE_REFERENCE,
  CORE_DRILLS,
  DAILY_HITTING_REMINDER,
  HIPS_FIRST_DRILLS,
  HITTING_CHAIN_STEPS,
  MONTHLY_PROGRESSIONS,
  PRACTICAL_TIPS,
  TARGETED_DRILLS,
  TEE_WORK_PRACTICE_NOTES,
  TEE_WORK_DRILLS,
  VIDEO_RESOURCES,
  WEEKLY_HITTING_SCHEDULE,
} from "@/lib/hitting-training";
import { parsePositiveIntegerInput } from "@/lib/input";
import { getMaxStreak } from "@/lib/progress";
import { getAppDateKey, getWeekKey } from "@/lib/time";
import type { AppData, LogSessionInput, Player, PracticeSession } from "@/lib/types";

type LessonTab = "overview" | "hips" | "tee" | "drills" | "analysis" | "videos" | "log";
type LogKind = "Hitting Practice" | "Swing Analysis Review";

const SOFTBALL_SPORT_ID = "10000000-0000-4000-8000-000000000001";

const PLAYER_AGES: Record<string, number> = {
  Roya: 10,
  Rayna: 7,
};

const TABS: Array<{
  id: LessonTab;
  label: string;
  icon: typeof BookOpen;
}> = [
  { id: "overview", label: "Start", icon: BookOpen },
  { id: "hips", label: "Hips First", icon: Flame },
  { id: "tee", label: "Tee Work", icon: Target },
  { id: "drills", label: "All Drills", icon: ClipboardCheck },
  { id: "analysis", label: "Swing Review", icon: Sparkles },
  { id: "videos", label: "Videos", icon: Video },
  { id: "log", label: "Log Practice", icon: NotebookPen },
];

const SUPPLEMENTAL_VIDEO_RESOURCES = VIDEO_RESOURCES.filter(
  (resource) => !resource.url.includes(ANAMARIE_BRUNI_TEE_REFERENCE.videoId),
);

type AnaMarieVideoDrill = (typeof ANAMARIE_BRUNI_TEE_REFERENCE.drills)[number];

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

function isHittingSession(session: PracticeSession) {
  const text = [
    session.practice_type,
    session.notes ?? "",
    ...session.drills.map((drill) => drill.drill_label),
  ]
    .join(" ")
    .toLowerCase();

  return [
    "hitting",
    "swing",
    "tee",
    "load",
    "stride",
    "knob",
    "bat path",
    "soft toss",
  ].some((keyword) => text.includes(keyword));
}

function profileLabel(player: Player) {
  const age = PLAYER_AGES[player.name];

  return age ? `${player.name} · age ${age}` : player.name;
}

function ProgressPill({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Trophy;
}) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-sky-600">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-black text-stone-950">{value}</p>
    </div>
  );
}

export function HittingTrainingModule({
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
  const [activeTab, setActiveTab] = useState<LessonTab>("overview");
  const [logKind, setLogKind] = useState<LogKind>("Hitting Practice");
  const [minutesInput, setMinutesInput] = useState("25");
  const [sessionDate, setSessionDate] = useState(() => getAppDateKey());
  const [selectedDrills, setSelectedDrills] = useState<string[]>([
    HIPS_FIRST_DRILLS[0].name,
    TEE_WORK_DRILLS[0].name,
    TEE_WORK_DRILLS[2].name,
  ]);
  const [selectedSteps, setSelectedSteps] = useState<string[]>([
    HITTING_CHAIN_STEPS[0].id,
    HITTING_CHAIN_STEPS[1].id,
    HITTING_CHAIN_STEPS[2].id,
  ]);
  const [feeling, setFeeling] = useState<string | null>("Good");
  const [reviewNotes, setReviewNotes] = useState("");
  const [improvedText, setImprovedText] = useState("");

  const activePlayer = selectedPlayer ?? data.players[0] ?? null;
  const softballSport =
    data.sports.find((sport) => sport.name.toLowerCase().includes("softball")) ??
    data.sports.find((sport) => sport.id === SOFTBALL_SPORT_ID) ??
    null;
  const minutes = parsePositiveIntegerInput(minutesInput);
  const today = getAppDateKey();
  const weekKey = getWeekKey(today);
  const playerSessions = activePlayer
    ? data.sessions.filter((session) => session.player_id === activePlayer.id)
    : [];
  const hittingSessions = playerSessions.filter(isHittingSession);
  const hittingThisWeek = hittingSessions.filter(
    (session) => session.status !== "rejected" && getWeekKey(session.session_date) === weekKey,
  );
  const hittingMinutesThisWeek = hittingThisWeek.reduce(
    (sum, session) => sum + session.minutes,
    0,
  );
  const totalHittingMinutes = hittingSessions
    .filter((session) => session.status !== "rejected")
    .reduce((sum, session) => sum + session.minutes, 0);
  const drillChecksThisWeek = hittingThisWeek.reduce(
    (sum, session) => sum + session.drills.filter((drill) => drill.completed).length,
    0,
  );
  const bestStreak = activePlayer ? getMaxStreak(activePlayer.id, data.sessions) : 0;

  const logDrillOptions = useMemo(
    () => {
      const allNames = [
        ...HIPS_FIRST_DRILLS.map((drill) => drill.name),
        ...TEE_WORK_DRILLS.map((drill) => drill.name),
        ...TARGETED_DRILLS.map((drill) => drill.name),
        ...CORE_DRILLS.map((drill) => drill.name),
        ...ANAMARIE_BRUNI_TEE_REFERENCE.drills.map((drill) => drill.logLabel),
      ];

      return Array.from(new Set(allNames));
    },
    [],
  );

  const openHipsFirstPractice = () => {
    setLogKind("Hitting Practice");
    setSelectedDrills(HIPS_FIRST_DRILLS.slice(0, 3).map((drill) => drill.name));
    setSelectedSteps(["load", "stride", "rotate"]);
    setActiveTab("log");
  };

  const openSwingReview = () => {
    setLogKind("Swing Analysis Review");
    setSelectedDrills([
      HIPS_FIRST_DRILLS[0].name,
      TARGETED_DRILLS[2].name,
      TARGETED_DRILLS[4].name,
    ]);
    setSelectedSteps(["load", "stride", "rotate", "finish"]);
    setActiveTab("log");
  };

  const openAnaMariePractice = () => {
    setLogKind("Hitting Practice");
    setMinutesInput("20");
    setSelectedDrills(
      ANAMARIE_BRUNI_TEE_REFERENCE.drills.map((drill) => drill.logLabel),
    );
    setSelectedSteps(
      Array.from(
        new Set(
          ANAMARIE_BRUNI_TEE_REFERENCE.drills.flatMap((drill) => drill.chainStepIds),
        ),
      ),
    );
    setReviewNotes(
      `${ANAMARIE_BRUNI_TEE_REFERENCE.title}: ${ANAMARIE_BRUNI_TEE_REFERENCE.practicePlan}`,
    );
    setImprovedText("");
    setActiveTab("log");
  };

  const openAnaMarieDrillPractice = (drill: AnaMarieVideoDrill) => {
    setLogKind("Hitting Practice");
    setMinutesInput("8");
    setSelectedDrills([drill.logLabel]);
    setSelectedSteps([...drill.chainStepIds]);
    setReviewNotes(
      `${drill.name} (${drill.timestamp}): ${drill.focus}. ${drill.useWhen}`,
    );
    setImprovedText("");
    setActiveTab("log");
  };

  const submitLog = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activePlayer || !softballSport || !minutes) {
      return;
    }

    const chainDrills = HITTING_CHAIN_STEPS.filter((step) =>
      selectedSteps.includes(step.id),
    ).map((step) => `Chain step: ${step.title}`);
    const drillLabels = [...selectedDrills, ...chainDrills];
    const noteLines = [
      reviewNotes.trim() ? `Swing Review / Notes: ${reviewNotes.trim()}` : null,
      improvedText.trim() ? `What improved: ${improvedText.trim()}` : null,
      `Reminder: ${DAILY_HITTING_REMINDER}`,
    ].filter((line): line is string => Boolean(line));

    onSubmit({
      player: activePlayer,
      sport_id: softballSport.id,
      practice_type: logKind,
      minutes,
      drills: drillLabels.map((label) => ({ label, completed: true })),
      feeling,
      notes: noteLines.join("\n"),
      hitting_side: null,
      session_date: sessionDate,
      require_parent_approval: data.settings.require_parent_approval,
    });
  };

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,_#cffafe_0,_#f8fafc_38%,_#f8fafc_100%)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-3">
          <button
            aria-label="Go back"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-sky-100"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 font-black text-sky-700 shadow-sm transition hover:bg-sky-50 focus:outline-none focus:ring-4 focus:ring-sky-100"
            href="/parent"
          >
            <UserRound className="h-5 w-5" />
            Parent Dashboard
          </Link>
        </header>

        <section className="relative mt-4 overflow-hidden rounded-[2rem] bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 p-6 text-white shadow-xl shadow-sky-200/60 sm:p-8">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border-[28px] border-white/10" />
          <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative max-w-3xl">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-cyan-50">
              <BookOpen className="h-5 w-5" />
              Softball hitting guide
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">
              Hips first. Tee work clear. Swing with a plan.
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-bold text-sky-50 sm:text-xl">
              Pick a lane: learn the swing chain, work hips-before-hands, run tee drills,
              then log the practice in a few taps.
            </p>
          </div>
        </section>

        <section className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-2xl border border-sky-100 bg-white p-3 shadow-sm">
            <p className="mb-2 px-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Who is practicing?
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.players.map((player) => (
                <button
                  className={classNames(
                    "flex min-h-14 items-center justify-between rounded-xl border px-4 text-left font-black transition focus:outline-none focus:ring-4 focus:ring-sky-100",
                    activePlayer?.id === player.id
                      ? "border-sky-300 bg-sky-50 text-sky-950"
                      : "border-slate-200 bg-white text-slate-700 hover:border-sky-200",
                  )}
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                  type="button"
                >
                  <span>{profileLabel(player)}</span>
                  {activePlayer?.id === player.id ? <Check className="h-5 w-5" /> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
              Today&apos;s cue
            </p>
            <p className="mt-2 text-xl font-black text-cyan-950">
              Hips fire, hands follow.
            </p>
          </div>
        </section>

        {activePlayer ? (
          <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ProgressPill
              icon={Trophy}
              label="Completed this week"
              value={`${hittingThisWeek.length} session${hittingThisWeek.length === 1 ? "" : "s"}`}
            />
            <ProgressPill
              icon={Zap}
              label="Hitting minutes"
              value={`${hittingMinutesThisWeek} min`}
            />
            <ProgressPill
              icon={ClipboardCheck}
              label="Drills checked"
              value={`${drillChecksThisWeek}`}
            />
            <ProgressPill icon={Flame} label="Best streak" value={`${bestStreak} days`} />
          </section>
        ) : null}

        <nav
          aria-label="Hitting guide sections"
          className="sticky top-0 z-10 -mx-4 mt-4 overflow-x-auto border-y border-sky-100 bg-slate-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border"
        >
          <div className="flex min-w-max gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  className={classNames(
                    "flex min-h-12 items-center gap-2 rounded-xl border px-4 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-sky-100",
                    activeTab === tab.id
                      ? "border-sky-600 bg-sky-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-sky-200",
                  )}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {activeTab === "overview" ? (
          <section className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-1 h-6 w-6 text-sky-600" />
                  <div>
                    <h2 className="text-2xl font-black text-stone-950">
                      The 6-Step Hitting Chain
                    </h2>
                    <p className="mt-2 text-lg font-black text-stone-700">
                      Say it out loud: {DAILY_HITTING_REMINDER}
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 sm:min-w-56">
                  <button
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 font-black text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100"
                    onClick={() => setActiveTab("hips")}
                    type="button"
                  >
                    <Flame className="h-5 w-5" />
                    Find hips-first drills
                  </button>
                  <button
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 font-black text-sky-950 transition hover:bg-sky-100 focus:outline-none focus:ring-4 focus:ring-sky-100"
                    onClick={() => setActiveTab("tee")}
                    type="button"
                  >
                    <Target className="h-5 w-5" />
                    Go to tee work
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {HITTING_CHAIN_STEPS.map((step, index) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  key={step.id}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-lg font-black text-sky-950">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-xl font-black text-stone-950">{step.title}</h3>
                      <p className="mt-1 font-black text-sky-700">{step.cue}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-base font-bold text-stone-600">{step.body}</p>
                  <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm font-black text-sky-900">
                    {step.kidCheck}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "hips" ? (
          <section className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-orange-700">
                <Flame className="h-5 w-5" />
                Hips-before-hands lane
              </p>
              <h2 className="mt-2 text-3xl font-black text-orange-950">
                Turn the hips first, then let the hands go.
              </h2>
              <p className="mt-2 max-w-3xl font-bold leading-7 text-orange-900">
                These are the drills to choose when her swing looks arm-y, her front side
                opens early, or she needs to feel the lower body start the swing.
              </p>
              <button
                className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 font-black text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-100"
                onClick={openHipsFirstPractice}
                type="button"
              >
                <NotebookPen className="h-5 w-5" />
                Build a hips-first log
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {HIPS_FIRST_DRILLS.map((drill) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  key={drill.name}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-500">
                        {drill.type}
                      </p>
                      <h3 className="mt-1 text-xl font-black text-stone-950">{drill.name}</h3>
                    </div>
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-800">
                      {drill.reps}
                    </span>
                  </div>
                  <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-sm font-black text-orange-900">
                    Cue: {drill.cue}
                  </p>
                  <p className="mt-3 font-bold leading-7 text-stone-600">{drill.why}</p>
                  <ol className="mt-4 grid gap-2">
                    {drill.steps.map((step, index) => (
                      <li className="flex gap-2 font-bold text-stone-700" key={step}>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-sky-800">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "tee" ? (
          <section className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-sky-700">
                <Target className="h-5 w-5" />
                Tee work lane
              </p>
              <h2 className="mt-2 text-3xl font-black text-sky-950">
                Tee work is where the swing gets organized.
              </h2>
              <p className="mt-2 max-w-3xl font-bold leading-7 text-sky-900">
                Start here when she needs simple reps, contact confidence, or a quiet place
                to practice hips-first movement before adding timing.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 font-black text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100"
                  onClick={openAnaMariePractice}
                  type="button"
                >
                  <NotebookPen className="h-5 w-5" />
                  Log this tee plan
                </button>
                <button
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-4 font-black text-sky-950 shadow-sm transition hover:bg-sky-100 focus:outline-none focus:ring-4 focus:ring-sky-100"
                  onClick={() => setActiveTab("videos")}
                  type="button"
                >
                  <Video className="h-5 w-5" />
                  Video source
                </button>
              </div>
            </div>

            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-emerald-700">
                    <ClipboardCheck className="h-5 w-5" />
                    Practice notes
                  </p>
                  <h3 className="mt-2 text-3xl font-black text-emerald-950">
                    {TEE_WORK_PRACTICE_NOTES.title}
                  </h3>
                  <p className="mt-2 text-lg font-black text-emerald-900">
                    {TEE_WORK_PRACTICE_NOTES.subtitle}
                  </p>
                </div>
                <button
                  className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-black text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                  onClick={openAnaMariePractice}
                  type="button"
                >
                  <NotebookPen className="h-5 w-5" />
                  Start log
                </button>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
                <aside className="rounded-2xl border border-emerald-200 bg-white p-4">
                  <h4 className="text-lg font-black text-stone-950">Set up first</h4>
                  <ul className="mt-3 grid gap-2">
                    {TEE_WORK_PRACTICE_NOTES.setup.map((item) => (
                      <li className="flex gap-2 text-sm font-black text-stone-700" key={item}>
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </aside>

                <div className="grid gap-3 md:grid-cols-3">
                  {TEE_WORK_PRACTICE_NOTES.rounds.map((round, index) => (
                    <article
                      className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm"
                      key={round.name}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white">
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="text-lg font-black text-stone-950">
                            {round.name}
                          </h4>
                          <p className="mt-1 text-sm font-black text-emerald-800">
                            {round.time} · {round.reps}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-950">
                        Goal: {round.goal}
                      </p>
                      <p className="mt-3 text-xl font-black text-slate-950">
                        Say: {round.say}
                      </p>
                      <ul className="mt-3 grid gap-2">
                        {round.doThis.map((item) => (
                          <li className="flex gap-2 text-sm font-bold text-stone-700" key={item}>
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
                <h4 className="text-lg font-black text-stone-950">Before you finish</h4>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {TEE_WORK_PRACTICE_NOTES.finish.map((item) => (
                    <div
                      className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-950"
                      key={item}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div>
              <h3 className="mb-3 text-xl font-black text-stone-950">
                More tee-work choices
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {TEE_WORK_DRILLS.map((drill) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    key={drill.name}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">
                          {drill.focus}
                        </p>
                        <h3 className="mt-1 text-xl font-black text-stone-950">
                          {drill.name}
                        </h3>
                      </div>
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-900">
                        {drill.reps}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-black uppercase tracking-wide text-stone-500">
                      Setup: {drill.setup}
                    </p>
                    <p className="mt-3 font-bold leading-7 text-stone-600">{drill.how}</p>
                    <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-900">
                      Check: {drill.check}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "analysis" ? (
          <section className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
              <h2 className="text-2xl font-black text-sky-950">
                Swing Analysis & Personalized Tips
              </h2>
              <p className="mt-2 text-base font-bold text-sky-900">
                Positive first, then one small fix at a time. She&apos;s already doing a lot
                right - many kids her age struggle more. Small tweaks will make her even
                stronger and more consistent, especially useful moving into travel/8U leagues.
              </p>
              <button
                className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 font-black text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200"
                onClick={openSwingReview}
                type="button"
              >
                <NotebookPen className="h-5 w-5" />
                Review My Swing
              </button>
            </div>

            <section>
              <h3 className="mb-3 text-xl font-black text-stone-950">
                Overall Strengths (from the example swing)
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {ANALYSIS_STRENGTHS.map((strength) => (
                  <div
                    className="flex min-h-16 items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4"
                    key={strength}
                  >
                    <Check className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                    <p className="font-black text-stone-800">{strength}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-xl font-black text-stone-950">
                Key Areas to Improve (Frame-by-Frame Style)
              </h3>
              <div className="grid gap-3">
                {ANALYSIS_AREAS.map((area, index) => (
                  <details
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    key={area.title}
                    open={index === 0}
                  >
                    <summary className="cursor-pointer text-lg font-black text-stone-950">
                      {index + 1}. {area.title}
                    </summary>
                    <p className="mt-3 text-base font-bold text-stone-600">
                      <span className="font-black text-stone-950">Look for: </span>
                      {area.issue}
                    </p>
                    <p className="mt-3 text-base font-bold text-sky-900">
                      <span className="font-black text-stone-950">Fix: </span>
                      {area.fix}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <h3 className="text-xl font-black text-amber-950">Biggest Opportunity</h3>
              <p className="mt-2 text-base font-black text-amber-900">
                Reduce long arm path and improve sequencing (hips before hands). Better
                lower-body drive + compact hands = more bat speed and consistency.
              </p>
              <button
                className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 font-black text-amber-950 shadow-sm transition hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-100"
                onClick={() => setActiveTab("hips")}
                type="button"
              >
                <Flame className="h-5 w-5" />
                Open hips-first drills
              </button>
            </div>

            <section>
              <h3 className="mb-3 text-xl font-black text-stone-950">
                Targeted Drills to Fix These Issues
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {TARGETED_DRILLS.map((drill) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    key={drill.name}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-lg font-black text-stone-950">{drill.name}</h4>
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-black text-sky-900">
                        {drill.reps}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-black uppercase tracking-wide text-stone-500">
                      {drill.chain}
                    </p>
                    <p className="mt-2 font-bold text-stone-600">{drill.instructions}</p>
                    <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm font-black text-sky-900">
                      Fixes: {drill.fixes}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" open>
              <summary className="cursor-pointer text-xl font-black text-stone-950">
                Other Practical Tips
              </summary>
              <ul className="mt-3 grid gap-2">
                {PRACTICAL_TIPS.map((tip) => (
                  <li className="flex gap-2 font-bold text-stone-700" key={tip}>
                    <span className="text-sky-700">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        ) : null}

        {activeTab === "drills" ? (
          <section className="mt-4 grid gap-4">
            <div>
              <h2 className="mb-3 text-2xl font-black text-stone-950">
                All hitting drills & weekly plan
              </h2>
              <p className="mb-4 max-w-2xl font-bold text-stone-600">
                Use the separate Hips First and Tee Work tabs when you want the fastest
                path. This list keeps the full drill library and weekly rhythm together.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {CORE_DRILLS.map((drill) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    key={drill.name}
                  >
                    <h3 className="text-lg font-black text-stone-950">{drill.name}</h3>
                    <p className="mt-2 text-sm font-black uppercase tracking-wide text-sky-700">
                      Chain: {drill.chain}
                    </p>
                    <p className="mt-2 font-bold text-stone-600">{drill.how}</p>
                    <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm font-black text-sky-900">
                      Addresses: {drill.fixes}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <section>
              <h3 className="mb-3 text-xl font-black text-stone-950">Weekly Schedule</h3>
              <div className="grid gap-3 lg:grid-cols-4">
                {WEEKLY_HITTING_SCHEDULE.map((day) => (
                  <article
                    className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm"
                    key={day.day}
                  >
                    <p className="text-sm font-black uppercase tracking-wide text-sky-700">
                      {day.day}
                    </p>
                    <h4 className="mt-1 text-lg font-black text-stone-950">{day.focus}</h4>
                    <p className="mt-2 font-bold text-stone-600">{day.plan}</p>
                    <p className="mt-3 text-sm font-black text-sky-900">
                      Helps with: {day.issues}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" open>
              <summary className="cursor-pointer text-xl font-black text-stone-950">
                Monthly Progression
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {MONTHLY_PROGRESSIONS.map((phase) => (
                  <div
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    key={phase.phase}
                  >
                    <p className="text-sm font-black uppercase tracking-wide text-stone-500">
                      {phase.phase}
                    </p>
                    <h4 className="mt-1 text-lg font-black text-stone-950">{phase.goal}</h4>
                    <p className="mt-2 font-bold text-stone-600">{phase.details}</p>
                  </div>
                ))}
              </div>
            </details>
          </section>
        ) : null}

        {activeTab === "videos" ? (
          <section className="mt-4 grid gap-4">
            <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
              <article className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
                <div className="aspect-video bg-slate-950">
                  <iframe
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full"
                    src={ANAMARIE_BRUNI_TEE_REFERENCE.embedUrl}
                    title={ANAMARIE_BRUNI_TEE_REFERENCE.title}
                  />
                </div>
                <div className="p-5">
                  <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-sky-700">
                    <Video className="h-5 w-5" />
                    {ANAMARIE_BRUNI_TEE_REFERENCE.label}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-stone-950">
                    {ANAMARIE_BRUNI_TEE_REFERENCE.title}
                  </h2>
                  <p className="mt-2 font-bold leading-7 text-stone-600">
                    {ANAMARIE_BRUNI_TEE_REFERENCE.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 font-black text-sky-900 transition hover:bg-sky-100 focus:outline-none focus:ring-4 focus:ring-sky-100"
                      href={ANAMARIE_BRUNI_TEE_REFERENCE.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open on YouTube <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 font-black text-white transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100"
                      onClick={openAnaMariePractice}
                      type="button"
                    >
                      <NotebookPen className="h-4 w-4" />
                      Build this practice log
                    </button>
                  </div>
                </div>
              </article>

              <aside className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
                  Best use
                </p>
                <h3 className="mt-2 text-2xl font-black text-cyan-950">
                  Make it a 20-minute tee station.
                </h3>
                <p className="mt-3 font-bold leading-7 text-cyan-900">
                  {ANAMARIE_BRUNI_TEE_REFERENCE.practicePlan}
                </p>
                <ol className="mt-4 grid gap-3">
                  {ANAMARIE_BRUNI_TEE_REFERENCE.drills.map((drill, index) => (
                    <li
                      className="flex gap-3 rounded-xl border border-cyan-200 bg-white/80 p-3"
                      key={drill.name}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-black text-white">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-black text-stone-950">{drill.name}</p>
                        <p className="mt-1 text-sm font-bold text-cyan-900">
                          {drill.timestamp} · {drill.reps}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </aside>
            </section>

            <section>
              <h3 className="mb-3 text-xl font-black text-stone-950">
                Timestamped drill notes
              </h3>
              <div className="grid gap-3 lg:grid-cols-3">
                {ANAMARIE_BRUNI_TEE_REFERENCE.drills.map((drill) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    key={drill.name}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">
                          {drill.timestamp}
                        </p>
                        <h4 className="mt-1 text-xl font-black text-stone-950">
                          {drill.name}
                        </h4>
                      </div>
                      <PlayCircle className="h-7 w-7 shrink-0 text-sky-600" />
                    </div>
                    <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm font-black text-sky-950">
                      Focus: {drill.focus}
                    </p>
                    <p className="mt-3 font-bold leading-7 text-stone-600">
                      Use when: {drill.useWhen}
                    </p>
                    <ul className="mt-4 grid gap-2">
                      {drill.cues.map((cue) => (
                        <li className="flex gap-2 text-sm font-bold text-stone-700" key={cue}>
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{cue}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 grid gap-2">
                      <a
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 text-sm font-black text-sky-900 transition hover:bg-sky-100 focus:outline-none focus:ring-4 focus:ring-sky-100"
                        href={drill.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Watch timestamp <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-sky-100"
                        onClick={() => openAnaMarieDrillPractice(drill)}
                        type="button"
                      >
                        <NotebookPen className="h-4 w-4" />
                        Log this drill
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
                <h3 className="text-xl font-black text-stone-950">
                  More videos & resources
                </h3>
                <p className="mt-2 font-bold text-stone-600">
                  Watch one clip, then practice one cue. Keep the lesson simple and fun.
                </p>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {SUPPLEMENTAL_VIDEO_RESOURCES.map((resource) => (
                <a
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-sky-100"
                  href={resource.url}
                  key={resource.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div className="flex items-start gap-3">
                    <PlayCircle className="mt-1 h-7 w-7 shrink-0 text-sky-600" />
                    <div>
                      <h3 className="text-lg font-black text-stone-950 group-hover:text-sky-700">
                        {resource.title}
                      </h3>
                      <p className="mt-2 font-bold text-stone-600">{resource.description}</p>
                      <p className="mt-3 flex items-center gap-1 text-sm font-black text-sky-700">
                        Open video <ExternalLink className="h-4 w-4" />
                      </p>
                    </div>
                  </div>
                </a>
              ))}
              </div>
            </section>
          </section>
        ) : null}

        {activeTab === "log" ? (
          <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
            <form
              className="grid gap-5 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm sm:p-6"
              onSubmit={submitLog}
            >
              <div>
                <h2 className="text-2xl font-black text-stone-950">Log Practice</h2>
                <p className="mt-2 font-bold text-stone-600">
                  Great effort! Small changes = big results. Log time, drills, and swing
                  notes here.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="font-black text-stone-950">Date</span>
                  <input
                    className="min-h-12 rounded-xl border border-slate-200 px-3 font-bold text-stone-950 outline-none focus:ring-4 focus:ring-sky-100"
                    onChange={(event) => setSessionDate(event.target.value)}
                    required
                    type="date"
                    value={sessionDate}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="font-black text-stone-950">Total time (minutes)</span>
                  <input
                    aria-invalid={minutesInput.trim() !== "" && !minutes}
                    className="min-h-12 rounded-xl border border-slate-200 px-3 font-bold text-stone-950 outline-none focus:ring-4 focus:ring-sky-100"
                    inputMode="numeric"
                    min={1}
                    onChange={(event) => setMinutesInput(event.target.value)}
                    placeholder="25"
                    required
                    step={1}
                    type="number"
                    value={minutesInput}
                  />
                </label>
              </div>

              <div>
                <p className="mb-2 font-black text-stone-950">Log type</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["Hitting Practice", "Swing Analysis Review"] as const).map((kind) => (
                    <button
                      className={classNames(
                        "min-h-12 rounded-xl border px-3 font-black",
                        logKind === kind
                          ? "border-sky-600 bg-sky-600 text-white"
                          : "border-stone-200 bg-white text-stone-700",
                      )}
                      key={kind}
                      onClick={() => setLogKind(kind)}
                      type="button"
                    >
                      {kind}
                    </button>
                  ))}
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 font-black text-stone-950">
                  Which drills did you practice?
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {logDrillOptions.map((drill) => (
                    <button
                      className={classNames(
                        "flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left text-sm font-black",
                        selectedDrills.includes(drill)
                          ? "border-sky-300 bg-sky-50 text-sky-950"
                          : "border-stone-200 bg-white text-stone-700",
                      )}
                      key={drill}
                      onClick={() => setSelectedDrills((current) => toggleValue(current, drill))}
                      type="button"
                    >
                      <span
                        className={classNames(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                          selectedDrills.includes(drill)
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-stone-300 bg-white",
                        )}
                      >
                        {selectedDrills.includes(drill) ? <Check className="h-4 w-4" /> : null}
                      </span>
                      {drill}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 font-black text-stone-950">
                  Chain steps practiced
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {HITTING_CHAIN_STEPS.map((step) => (
                    <button
                      className={classNames(
                        "min-h-12 rounded-xl border px-3 text-sm font-black",
                        selectedSteps.includes(step.id)
                          ? "border-sky-500 bg-sky-50 text-sky-950"
                          : "border-stone-200 bg-white text-stone-700",
                      )}
                      key={step.id}
                      onClick={() =>
                        setSelectedSteps((current) => toggleValue(current, step.id))
                      }
                      type="button"
                    >
                      {step.title}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="grid gap-2">
                <span className="font-black text-stone-950">Swing Review / Notes</span>
                <textarea
                  className="min-h-28 rounded-xl border border-slate-200 p-3 font-medium text-stone-950 outline-none focus:ring-4 focus:ring-sky-100"
                  onChange={(event) => setReviewNotes(event.target.value)}
                  placeholder="Worked on shorter stride and knob to ball. Video notes: side view looked balanced."
                  value={reviewNotes}
                />
              </label>

              <label className="grid gap-2">
                <span className="font-black text-stone-950">How it felt / What improved</span>
                <textarea
                  className="min-h-24 rounded-xl border border-slate-200 p-3 font-medium text-stone-950 outline-none focus:ring-4 focus:ring-sky-100"
                  onChange={(event) => setImprovedText(event.target.value)}
                  placeholder="More line drives. Stayed balanced at the finish."
                  value={improvedText}
                />
              </label>

              <div>
                <p className="mb-2 font-black text-stone-950">How did it feel?</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {FEELINGS.map((candidate) => (
                    <button
                      className={classNames(
                        "min-h-12 rounded-xl border px-3 font-black",
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

              <button
                className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-xl font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!activePlayer || !softballSport || !minutes}
                type="submit"
              >
                <NotebookPen className="h-5 w-5" />
                Save Hitting Log
              </button>
            </form>

            <aside className="grid content-start gap-3">
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
                <h3 className="text-lg font-black text-stone-950">Current player</h3>
                <p className="mt-2 text-2xl font-black text-sky-900">
                  {activePlayer ? profileLabel(activePlayer) : "Add an athlete first"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black text-stone-950">Totals</h3>
                <p className="mt-2 font-bold text-stone-600">
                  {Math.round((totalHittingMinutes / 60) * 10) / 10} total hitting hours logged.
                </p>
                <p className="mt-2 font-bold text-stone-600">
                  {data.settings.require_parent_approval
                    ? "A parent approves sessions before they count toward goals."
                    : "Saved sessions count right away."}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <FileText className="h-6 w-6 text-amber-700" />
                <p className="mt-2 font-black text-amber-950">
                  Tweak one thing per session. Praise effort and contact first.
                </p>
              </div>
            </aside>
          </section>
        ) : null}
      </div>
    </main>
  );
}
