"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarCheck,
  Check,
  ClipboardList,
  Clock3,
  Edit3,
  Frown,
  Gift,
  Medal,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { FEELINGS, FOCUS_TAGS, SUMMER_REWARD_POINTS } from "@/lib/config";
import { recomputePlayerBadges } from "@/lib/badges";
import { parsePositiveIntegerInput } from "@/lib/input";
import {
  deletePlayerRemote,
  deleteSessionRemote,
  isParentPinSetRemote,
  loadAppData,
  persistLocalState,
  recomputeBadgesForPlayer,
  replacePlayerSportsRemote,
  replaceBadgesRemote,
  savePlayerRemote,
  saveSessionRemote,
  saveSettingsRemote,
  setParentPinRemote,
  saveTemplateRemote,
  verifyParentPinRemote,
} from "@/lib/data-client";
import { createId, formatShortDate, getAppDateKey, nowIso } from "@/lib/time";
import { getMaxStreak, getSummerRewardProgress, getWeeklyProgress } from "@/lib/progress";
import type {
  AppData,
  AppDataResult,
  DrillTemplate,
  Handedness,
  HittingSide,
  Player,
  PlayerSport,
  PracticeSession,
  SessionStatus,
} from "@/lib/types";

const SOFTBALL_SPORT_ID = "10000000-0000-4000-8000-000000000001";

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ProgressBar({
  value,
  tone = "violet",
  label = "Progress",
}: {
  value: number;
  tone?: "violet" | "blue";
  label?: string;
}) {
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.min(100, Math.max(0, value))}
      className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
    >
      <div
        className={classNames(
          "h-full rounded-full transition-all",
          tone === "violet"
            ? "bg-gradient-to-r from-violet-500 to-fuchsia-500"
            : "bg-gradient-to-r from-cyan-500 to-blue-500",
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function DashboardStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone: "amber" | "sky" | "violet";
}) {
  const toneClasses = {
    amber: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
  } as const;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={classNames("flex h-11 w-11 items-center justify-center rounded-xl", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      </div>
      <p className="mt-4 text-4xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function sessionStatusStyle(status: SessionStatus) {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "rejected") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function syncStateLabel(syncState: PracticeSession["sync_state"], mode: AppDataResult["mode"]) {
  if (syncState === "queued") {
    return mode === "local" ? "local only" : "waiting to sync";
  }

  if (syncState === "error") {
    return "sync failed";
  }

  return syncState;
}

function SessionEditor({
  session,
  onCancel,
  onSave,
}: {
  session: PracticeSession;
  onCancel: () => void;
  onSave: (session: PracticeSession) => void;
}) {
  const [draft, setDraft] = useState(session);
  const [minutesInput, setMinutesInput] = useState(String(session.minutes));
  const parsedMinutes = parsePositiveIntegerInput(minutesInput);

  const saveDraft = () => {
    if (!parsedMinutes) {
      return;
    }

    onSave({ ...draft, minutes: parsedMinutes });
  };

  return (
    <div className="fixed inset-0 z-20 overflow-auto bg-stone-950/40 p-4">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-stone-950">Edit session</h2>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200"
            onClick={onCancel}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-stone-600">
            Practice plan
            <input
              className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
              onChange={(event) => setDraft({ ...draft, practice_type: event.target.value })}
              value={draft.practice_type}
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-stone-600">
            Minutes
            <input
              className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
              aria-invalid={minutesInput.trim() !== "" && !parsedMinutes}
              inputMode="numeric"
              min={1}
              onChange={(event) => setMinutesInput(event.target.value)}
              step={1}
              type="number"
              value={minutesInput}
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-stone-600">
            Date
            <input
              className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
              onChange={(event) => setDraft({ ...draft, session_date: event.target.value })}
              type="date"
              value={draft.session_date}
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-stone-600">
            Status
            <select
              className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
              onChange={(event) => {
                const status = event.target.value as SessionStatus;
                setDraft({
                  ...draft,
                  status,
                  approved_at: status === "approved" ? draft.approved_at ?? nowIso() : null,
                  approved_by: status === "approved" ? draft.approved_by ?? "parent" : null,
                  rejected_reason: status === "rejected" ? draft.rejected_reason ?? "" : null,
                });
              }}
              value={draft.status}
            >
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-stone-600">
            Feeling
            <select
              className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
              onChange={(event) => setDraft({ ...draft, feeling: event.target.value || null })}
              value={draft.feeling ?? ""}
            >
              <option value="">None</option>
              {FEELINGS.map((feeling) => (
                <option key={feeling} value={feeling}>
                  {feeling}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-stone-600">
            Focus
            <select
              className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
              onChange={(event) => setDraft({ ...draft, focus_tag: event.target.value || null })}
              value={draft.focus_tag ?? ""}
            >
              <option value="">None</option>
              {FOCUS_TAGS.map((focus) => (
                <option key={focus} value={focus}>
                  {focus}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-stone-600">
            Switch side
            <select
              className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
              onChange={(event) =>
                setDraft({ ...draft, hitting_side: (event.target.value || null) as HittingSide })
              }
              value={draft.hitting_side ?? ""}
            >
              <option value="">None</option>
              <option value="L">L</option>
              <option value="R">R</option>
              <option value="both">Both</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-stone-600 sm:col-span-2">
            Notes
            <textarea
              className="min-h-24 rounded-md border border-stone-200 p-3 text-base font-medium text-stone-950"
              onChange={(event) => setDraft({ ...draft, notes: event.target.value || null })}
              value={draft.notes ?? ""}
            />
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
          <h3 className="font-black text-stone-950">Drills</h3>
          <div className="mt-3 grid gap-2">
            {draft.drills.map((drill, index) => (
              <div className="grid gap-2 sm:grid-cols-[auto_1fr]" key={drill.id}>
                <button
                  className={classNames(
                    "flex min-h-11 items-center justify-center rounded-md border px-3 font-black",
                    drill.completed
                      ? "border-sky-300 bg-sky-50 text-sky-800"
                      : "border-stone-200 bg-white text-stone-500",
                  )}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      drills: draft.drills.map((candidate, candidateIndex) =>
                        candidateIndex === index
                          ? { ...candidate, completed: !candidate.completed }
                          : candidate,
                      ),
                    })
                  }
                  type="button"
                >
                  {drill.completed ? "Done" : "Skip"}
                </button>
                <input
                  className="min-h-11 rounded-md border border-stone-200 px-3 font-medium"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      drills: draft.drills.map((candidate, candidateIndex) =>
                        candidateIndex === index
                          ? { ...candidate, drill_label: event.target.value }
                          : candidate,
                      ),
                    })
                  }
                  value={drill.drill_label}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="min-h-11 rounded-md border border-stone-200 px-4 font-black text-stone-700"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={classNames(
              "flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-950 px-4 font-black text-white",
              !parsedMinutes && "cursor-not-allowed opacity-50",
            )}
            disabled={!parsedMinutes}
            onClick={saveDraft}
            type="button"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </section>
    </div>
  );
}

function PendingCard({
  data,
  session,
  onApprove,
  onEdit,
  onReject,
}: {
  data: AppData;
  session: PracticeSession;
  onApprove: (session: PracticeSession) => void;
  onEdit: (session: PracticeSession) => void;
  onReject: (session: PracticeSession, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const player = data.players.find((candidate) => candidate.id === session.player_id);

  return (
    <article className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-amber-700">Pending</p>
          <h3 className="mt-1 text-xl font-black text-stone-950">
            {player?.name ?? "Athlete"} - {session.practice_type}
          </h3>
          <p className="mt-1 font-bold text-stone-600">
            {session.minutes} min on {formatShortDate(session.session_date)}
            {session.sync_state === "queued" ? " - saved on device" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 font-black text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100"
            onClick={() => onApprove(session)}
            type="button"
          >
            <Check className="h-4 w-4" />
            Approve
          </button>
          <button
            className="flex min-h-11 items-center gap-2 rounded-md border border-stone-200 px-3 font-black text-stone-700"
            onClick={() => onEdit(session)}
            type="button"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className="min-h-11 rounded-md border border-stone-200 px-3 font-medium"
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reject reason"
          value={reason}
        />
        <button
          className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-rose-200 px-3 font-black text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!reason.trim()}
          onClick={() => onReject(session, reason.trim())}
          type="button"
        >
          <X className="h-4 w-4" />
          Reject
        </button>
      </div>
    </article>
  );
}

function ApprovalCodeDialog({
  mode,
  onConfirm,
}: {
  mode: "setup" | "unlock";
  onConfirm: (pin: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const confirm = async () => {
    if (!code.trim() || checking) {
      return;
    }

    if (mode === "setup" && code !== confirmation) {
      setError("Those PINs do not match.");
      return;
    }

    if (!/^\d{4,8}$/.test(code)) {
      setError("Use 4 to 8 numbers for the parent PIN.");
      return;
    }

    setChecking(true);
    setError(null);

    try {
      await onConfirm(code);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not verify the parent code.");
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/50 p-4">
      <section
        aria-labelledby="approval-code-title"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
      >
        <ShieldCheck className="h-10 w-10 text-violet-600" />
        <h2 className="mt-3 text-2xl font-black text-stone-950" id="approval-code-title">
          {mode === "setup" ? "Create parent PIN" : "Parent dashboard"}
        </h2>
        <p className="mt-2 font-bold text-stone-600">
          {mode === "setup"
            ? "Choose a PIN that only the parents know."
            : "Enter the parent PIN to open the dashboard."}
        </p>
        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            void confirm();
          }}
        >
          <label className="grid gap-2 text-sm font-black text-stone-600">
            Parent PIN
            <input
              autoFocus
              className="min-h-12 rounded-md border border-stone-200 px-3 text-center text-xl font-black tracking-[0.3em] text-stone-950"
              inputMode="numeric"
              onChange={(event) => setCode(event.target.value)}
              type="password"
              value={code}
            />
          </label>
          {mode === "setup" ? (
            <label className="mt-3 grid gap-2 text-sm font-black text-stone-600">
              Confirm PIN
              <input
                className="min-h-12 rounded-md border border-stone-200 px-3 text-center text-xl font-black tracking-[0.3em] text-stone-950"
                inputMode="numeric"
                onChange={(event) => setConfirmation(event.target.value)}
                type="password"
                value={confirmation}
              />
            </label>
          ) : null}
          {error ? <p className="mt-3 font-bold text-rose-700">{error}</p> : null}
          <div className="mt-5 grid gap-2">
            <button
              className="min-h-11 rounded-md bg-violet-600 px-4 font-black text-white disabled:opacity-50"
              disabled={!code.trim() || (mode === "setup" && !confirmation) || checking}
              type="submit"
            >
              {checking
                ? "Checking…"
                : mode === "setup"
                  ? "Create PIN"
                  : "Open dashboard"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PlayerSettingsCard({
  player,
  onDelete,
  onUpdate,
}: {
  player: Player;
  onDelete: (player: Player) => void;
  onUpdate: (player: Player) => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-xl font-black text-stone-950">{player.name}</h3>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-md border border-rose-200 text-rose-700"
          onClick={() => onDelete(player)}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-black text-stone-600">
          Name
          <input
            className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
            onBlur={(event) => onUpdate({ ...player, name: event.target.value.trim() || player.name })}
            defaultValue={player.name}
          />
        </label>
        <label className="grid gap-1 text-sm font-black text-stone-600">
          Batting hand (softball)
          <select
            className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
            onChange={(event) =>
              onUpdate({ ...player, handedness: event.target.value as Handedness })
            }
            value={player.handedness}
          >
            <option value="R">R</option>
            <option value="L">L</option>
            <option value="switch">switch</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-black text-stone-600">
          Weekly goal
          <input
            className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
            min={1}
            onBlur={(event) => {
              const weeklyGoal = parsePositiveIntegerInput(event.target.value);

              if (!weeklyGoal) {
                event.target.value = String(player.weekly_goal_minutes);
                return;
              }

              onUpdate({ ...player, weekly_goal_minutes: weeklyGoal });
            }}
            type="number"
            defaultValue={player.weekly_goal_minutes}
          />
        </label>
        <label className="grid gap-1 text-sm font-black text-stone-600">
          Season goal
          <input
            className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
            min={1}
            onBlur={(event) => {
              const summerGoal = parsePositiveIntegerInput(event.target.value);

              if (!summerGoal) {
                event.target.value = String(player.summer_goal_minutes);
                return;
              }

              onUpdate({ ...player, summer_goal_minutes: summerGoal });
            }}
            type="number"
            defaultValue={player.summer_goal_minutes}
          />
        </label>
        <label className="grid gap-1 text-sm font-black text-stone-600">
          Season start
          <input
            className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
            onChange={(event) => onUpdate({ ...player, summer_start_date: event.target.value })}
            type="date"
            value={player.summer_start_date}
          />
        </label>
        <label className="grid gap-1 text-sm font-black text-stone-600">
          Season end
          <input
            className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
            onChange={(event) => onUpdate({ ...player, summer_end_date: event.target.value })}
            type="date"
            value={player.summer_end_date}
          />
        </label>
      </div>
    </article>
  );
}

function TemplateCard({
  template,
  onSave,
}: {
  template: DrillTemplate;
  onSave: (template: DrillTemplate) => void;
}) {
  const [draft, setDraft] = useState(template);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-black uppercase tracking-wide text-sky-700">
        Softball practice plan
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-black text-stone-600">
          Name
          <input
            className="min-h-11 rounded-md border border-stone-200 px-3 font-bold text-stone-950"
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            value={draft.name}
          />
        </label>
        <label className="grid gap-1 text-sm font-black text-stone-600">
          Plan name
          <input
            className="min-h-11 rounded-md border border-stone-200 px-3 font-bold text-stone-950"
            onChange={(event) => setDraft({ ...draft, practice_type: event.target.value })}
            value={draft.practice_type}
          />
        </label>
      </div>
      <div className="mt-3 grid gap-2">
        {draft.items.map((item) => (
          <div className="grid grid-cols-[1fr_auto] gap-2" key={item.id}>
            <input
              className="min-h-11 rounded-md border border-stone-200 px-3 font-medium"
              onChange={(event) =>
                setDraft({
                  ...draft,
                  items: draft.items.map((candidate) =>
                    candidate.id === item.id ? { ...candidate, label: event.target.value } : candidate,
                  ),
                })
              }
              value={item.label}
            />
            <button
              className="flex h-11 w-11 items-center justify-center rounded-md border border-stone-200 text-stone-500"
              onClick={() =>
                setDraft({ ...draft, items: draft.items.filter((candidate) => candidate.id !== item.id) })
              }
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-stone-200 px-3 font-black text-stone-700"
          onClick={() =>
            setDraft({
              ...draft,
              items: [
                ...draft.items,
                {
                  id: createId(),
                  template_id: draft.id,
                  label: "new drill",
                  sort_order: (draft.items.length + 1) * 10,
                  created_at: nowIso(),
                },
              ],
            })
          }
          type="button"
        >
          <Plus className="h-4 w-4" />
          Add drill
        </button>
        <button
          className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-950 px-3 font-black text-white"
          onClick={() => onSave(draft)}
          type="button"
        >
          <Save className="h-4 w-4" />
          Save template
        </button>
      </div>
    </article>
  );
}

export function ParentApp() {
  const [pinState, setPinState] = useState<
    "checking" | "setup" | "unlock" | "unlocked" | "failed"
  >("checking");
  const [result, setResult] = useState<AppDataResult | null>(null);
  const [editingSession, setEditingSession] = useState<PracticeSession | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlanName, setNewPlanName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isParentPinSetRemote()
      .then((isSet) => setPinState(isSet ? "unlock" : "setup"))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Could not check the parent PIN.");
        setPinState("failed");
      });
  }, []);

  useEffect(() => {
    if (pinState !== "unlocked") {
      return;
    }

    let mounted = true;

    loadAppData()
      .then((loaded) => {
        if (mounted) {
          setResult(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (mounted) {
          setError(caught instanceof Error ? caught.message : "Could not load parent data.");
        }
      });

    return () => {
      mounted = false;
    };
  }, [pinState]);

  const data = result?.data;
  const mode = result?.mode ?? "local";
  const today = getAppDateKey();
  const pendingSessions = useMemo(
    () => data?.sessions.filter((session) => session.status === "pending") ?? [],
    [data],
  );
  const recentSessions = useMemo(
    () => (data ? [...data.sessions].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12) : []),
    [data],
  );

  const updateData = (nextData: AppData) => {
    if (!result) {
      return;
    }

    setResult({ ...result, data: nextData });
    persistLocalState(nextData, result.mode);
  };

  const saveSessionChange = async (session: PracticeSession) => {
    if (!data) {
      return;
    }

    let nextData: AppData = {
      ...data,
      sessions: data.sessions.map((candidate) =>
        candidate.id === session.id ? { ...session, sync_state: candidate.sync_state } : candidate,
      ),
    };
    nextData = recomputeBadgesForPlayer(nextData, session.player_id);
    updateData(nextData);
    setEditingSession(null);

    try {
      if (mode === "supabase") {
        await saveSessionRemote(session);
        await replaceBadgesRemote(
          session.player_id,
          nextData.playerBadges.filter((badge) => badge.player_id === session.player_id),
        );
      }
      setNotice("Session saved.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Session saved on this device.");
    }
  };

  const approveSession = (session: PracticeSession) => {
    void saveSessionChange({
      ...session,
      status: "approved",
      approved_by: "parent",
      approved_at: nowIso(),
      rejected_reason: null,
    });
  };

  const submitParentPin = async (pin: string) => {
    if (pinState === "setup") {
      await setParentPinRemote(pin);
      setPinState("unlocked");
      return;
    }

    const isValid = await verifyParentPinRemote(pin);

    if (!isValid) {
      throw new Error("That parent PIN is incorrect.");
    }

    setPinState("unlocked");
  };

  const rejectSession = (session: PracticeSession, reason: string) => {
    void saveSessionChange({
      ...session,
      status: "rejected",
      approved_by: null,
      approved_at: null,
      rejected_reason: reason,
    });
  };

  const deleteSession = async (session: PracticeSession) => {
    if (!data || !window.confirm("Delete this session?")) {
      return;
    }

    let nextData: AppData = {
      ...data,
      sessions: data.sessions.filter((candidate) => candidate.id !== session.id),
    };
    nextData = recomputeBadgesForPlayer(nextData, session.player_id);
    updateData(nextData);

    try {
      if (mode === "supabase") {
        await deleteSessionRemote(session.id);
        await replaceBadgesRemote(
          session.player_id,
          nextData.playerBadges.filter((badge) => badge.player_id === session.player_id),
        );
      }
      setNotice("Session deleted.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not delete from Supabase.");
    }
  };

  const savePlayer = async (player: Player) => {
    if (!data) {
      return;
    }

    let nextData: AppData = {
      ...data,
      players: data.players
        .map((candidate) => (candidate.id === player.id ? player : candidate))
        .sort((a, b) => a.display_order - b.display_order),
    };
    nextData = {
      ...nextData,
      playerBadges: [
        ...nextData.playerBadges.filter((badge) => badge.player_id !== player.id),
        ...recomputePlayerBadges(
          player,
          nextData.sessions,
          nextData.badges,
          nextData.playerBadges.filter((badge) => badge.player_id === player.id),
        ),
      ],
    };
    updateData(nextData);

    try {
      if (mode === "supabase") {
        await savePlayerRemote(player);
        await replaceBadgesRemote(
          player.id,
          nextData.playerBadges.filter((badge) => badge.player_id === player.id),
        );
      }
      setNotice("Athlete saved.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Athlete saved on this device.");
    }
  };

  const addPlayer = () => {
    if (!data || !data.family || !newPlayerName.trim()) {
      return;
    }

    const timestamp = nowIso();
    const year = today.slice(0, 4);
    const player: Player = {
      id: createId(),
      family_id: data.family.id,
      name: newPlayerName.trim(),
      display_order: data.players.length + 1,
      handedness: "R",
      weekly_goal_minutes: 90,
      summer_goal_minutes: 1200,
      summer_start_date: `${year}-06-01`,
      summer_end_date: `${year}-08-09`,
      created_at: timestamp,
    };
    const assignment: PlayerSport = {
      player_id: player.id,
      sport_id: SOFTBALL_SPORT_ID,
      created_at: timestamp,
    };
    const nextData = {
      ...data,
      players: [...data.players, player],
      playerSports: [...data.playerSports, assignment],
    };

    setNewPlayerName("");
    updateData(nextData);
    void (async () => {
      try {
        if (mode === "supabase") {
          await savePlayerRemote(player);
          await replacePlayerSportsRemote(player.id, [assignment]);
        }
        setNotice("Athlete added.");
      } catch (caught) {
        setNotice(caught instanceof Error ? caught.message : "Athlete saved on this device.");
      }
    })();
  };

  const addTemplate = async () => {
    if (!data || !data.family || !newPlanName.trim()) {
      return;
    }

    const timestamp = nowIso();
    const template: DrillTemplate = {
      id: createId(),
      family_id: data.family.id,
      sport_id: SOFTBALL_SPORT_ID,
      name: newPlanName.trim(),
      practice_type: newPlanName.trim(),
      editable: true,
      created_at: timestamp,
      items: [],
    };
    const nextData = { ...data, templates: [...data.templates, template] };
    setNewPlanName("");
    updateData(nextData);

    try {
      if (mode === "supabase") {
        await saveTemplateRemote(template);
      }
      setNotice("Practice plan added. Add drills to it below.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Plan saved on this device.");
    }
  };

  const removePlayer = async (player: Player) => {
    // ASSUMPTION: Deleting a player cascade-deletes their sessions and badge rows after a browser confirm.
    if (!data || !window.confirm(`Delete ${player.name} and all of their sessions?`)) {
      return;
    }

    const nextData: AppData = {
      ...data,
      players: data.players.filter((candidate) => candidate.id !== player.id),
      playerSports: data.playerSports.filter((assignment) => assignment.player_id !== player.id),
      sessions: data.sessions.filter((session) => session.player_id !== player.id),
      playerBadges: data.playerBadges.filter((badge) => badge.player_id !== player.id),
    };
    updateData(nextData);

    try {
      if (mode === "supabase") {
        await deletePlayerRemote(player.id);
      }
      setNotice("Athlete deleted.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not delete from Supabase.");
    }
  };

  const toggleApproval = async () => {
    if (!data) {
      return;
    }

    const settings = {
      ...data.settings,
      require_parent_approval: !data.settings.require_parent_approval,
      updated_at: nowIso(),
    };
    const nextData = { ...data, settings };
    updateData(nextData);

    try {
      if (mode === "supabase") {
        await saveSettingsRemote(settings);
      }
      setNotice("Approval setting saved.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Setting saved on this device.");
    }
  };

  const saveTemplate = async (template: DrillTemplate) => {
    if (!data) {
      return;
    }

    const nextData = {
      ...data,
      templates: data.templates.map((candidate) =>
        candidate.id === template.id ? template : candidate,
      ),
    };
    updateData(nextData);

    try {
      if (mode === "supabase") {
        await saveTemplateRemote(template);
      }
      setNotice("Practice plan saved.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Practice plan saved on this device.");
    }
  };

  if (pinState === "checking") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-100 p-4">
        <ShieldCheck className="h-12 w-12 animate-pulse text-violet-600" />
      </main>
    );
  }

  if (pinState === "setup" || pinState === "unlock") {
    return <ApprovalCodeDialog mode={pinState} onConfirm={submitParentPin} />;
  }

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-50 p-4">
        <section className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <Frown className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="mt-3 text-2xl font-black text-stone-950">Parent page needs help</h1>
          <p className="mt-2 text-base font-bold text-stone-600">{error}</p>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-50 p-4">
        <section className="rounded-2xl border border-violet-100 bg-white p-6 text-center shadow-sm">
          <Settings className="mx-auto h-10 w-10 animate-pulse text-violet-600" />
          <p className="mt-3 text-xl font-black text-stone-950">Loading parent tools.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,_#ede9fe_0,_#f8fafc_40%,_#f8fafc_100%)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      {editingSession ? (
        <SessionEditor
          key={editingSession.id}
          onCancel={() => setEditingSession(null)}
          onSave={(session) => void saveSessionChange(session)}
          session={editingSession}
        />
      ) : null}

      <header className="mb-4">
        <Link
          aria-label="Back to athlete picker"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-violet-100"
          href="/"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </header>

      <section className="relative mb-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-700 p-6 text-white shadow-xl shadow-violet-200/50 sm:p-8">
        <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full border-[30px] border-white/10" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-violet-200">
              <ShieldCheck className="h-5 w-5" />
              Softball parent tools
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
              Parent Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-lg font-bold text-violet-100">
              Approve practice, follow summer goals, and keep every softball session organized.
            </p>
          </div>
          <button
            className={classNames(
              "flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 font-black shadow-sm transition focus:outline-none focus:ring-4 focus:ring-white/20",
              data.settings.require_parent_approval
                ? "border-white/30 bg-white text-violet-950 hover:bg-violet-50"
                : "border-white/20 bg-white/10 text-white hover:bg-white/20",
            )}
            onClick={toggleApproval}
            type="button"
          >
            <ShieldCheck className="h-5 w-5" />
            Approval {data.settings.require_parent_approval ? "on" : "off"}
          </button>
        </div>
      </section>

      {notice ? (
        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 font-bold text-sky-950">
          {notice}
        </div>
      ) : null}

      {mode === "local" ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 font-bold text-amber-950">
          Supabase is not connected in this build. Changes are saved only on this device.
        </div>
      ) : null}

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <DashboardStat
          icon={Clock3}
          label="Waiting for review"
          tone="amber"
          value={String(pendingSessions.length)}
        />
        <DashboardStat
          icon={Target}
          label="Athletes"
          tone="violet"
          value={String(data.players.length)}
        />
        <DashboardStat
          icon={Activity}
          label="Softball sessions"
          tone="sky"
          value={String(data.sessions.length)}
        />
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Gift className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-black text-slate-950">Summer reward progress</h2>
            <p className="text-sm font-bold text-slate-500">
              {SUMMER_REWARD_POINTS.toLocaleString()} points when each athlete reaches the August 9 goal.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.players.map((player) => {
            const weekly = getWeeklyProgress(player, data.sessions, today);
            const reward = getSummerRewardProgress(player, data.sessions, today);
            const streak = getMaxStreak(player.id, data.sessions);
            const badges = data.playerBadges.filter((badge) => badge.player_id === player.id);

            return (
              <article
                className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"
                key={player.id}
              >
                <div className="bg-gradient-to-r from-violet-600 to-fuchsia-500 p-5 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black">
                        {player.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <h3 className="text-2xl font-black">{player.name}</h3>
                        <p className="text-sm font-bold text-violet-100">
                          {reward.met ? "Reward unlocked" : `${reward.remaining} minutes to go`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-sm font-black">
                      <Medal className="h-4 w-4" />
                      {badges.length}
                    </div>
                  </div>
                </div>
                <div className="grid gap-5 p-5">
                  <div>
                    <div className="mb-2 flex justify-between text-sm font-black text-slate-600">
                      <span>This week</span>
                      <span>
                        {weekly.minutes}/{player.weekly_goal_minutes}
                      </span>
                    </div>
                    <ProgressBar label={`${player.name} weekly progress`} value={weekly.percent} />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm font-black text-slate-600">
                      <span>Summer reward · Aug 9</span>
                      <span>
                        {reward.minutes}/{reward.goalMinutes}
                      </span>
                    </div>
                    <ProgressBar
                      label={`${player.name} summer reward progress`}
                      tone="blue"
                      value={reward.percent}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm font-black">
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-800">
                      🔥 Best streak: {streak} days
                    </span>
                    {!reward.met && !reward.ended ? (
                      <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-800">
                        {reward.daysRemaining} days left
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-slate-950">
          <CalendarCheck className="h-6 w-6 text-violet-600" />
          Practice review
        </h2>
        {pendingSessions.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-5 font-bold text-violet-950">
            <Check className="h-6 w-6 text-violet-600" />
            All caught up—no sessions are waiting for approval.
          </div>
        ) : (
          <div className="grid gap-3">
            {pendingSessions.map((session) => (
              <PendingCard
                data={data}
                key={session.id}
                onApprove={approveSession}
                onEdit={setEditingSession}
                onReject={rejectSession}
                session={session}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-black text-slate-950">
          <Sparkles className="h-6 w-6 text-sky-600" />
          Recent softball sessions
        </h2>
        <div className="grid gap-3">
          {recentSessions.map((session) => {
            const player = data.players.find((candidate) => candidate.id === session.player_id);

            return (
              <article
                className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md sm:grid-cols-[1fr_auto]"
                key={session.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-stone-950">
                      {player?.name ?? "Athlete"} - {session.practice_type}
                    </h3>
                    <span
                      className={classNames(
                        "rounded-full border px-2 py-0.5 text-xs font-black",
                        sessionStatusStyle(session.status),
                      )}
                    >
                      {session.status}
                    </span>
                    {session.sync_state && session.sync_state !== "synced" ? (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-black text-sky-800">
                        {syncStateLabel(session.sync_state, mode)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-bold text-stone-600">
                    {session.minutes} min - {formatShortDate(session.session_date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    aria-label={`Edit ${player?.name ?? "athlete"} session`}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setEditingSession(session)}
                    type="button"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={`Delete ${player?.name ?? "athlete"} session`}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 text-rose-700 transition hover:bg-rose-50"
                    onClick={() => void deleteSession(session)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Athletes and goals</h2>
            <p className="mt-1 font-bold text-slate-500">Manage softball goals and summer dates.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label>
              <span className="sr-only">Athlete name</span>
              <input
                aria-label="Athlete name"
                className="min-h-12 w-full rounded-xl border border-slate-200 px-3 font-bold text-slate-950 outline-none focus:ring-4 focus:ring-violet-100"
                onChange={(event) => setNewPlayerName(event.target.value)}
                placeholder="Athlete name"
                value={newPlayerName}
              />
            </label>
            <button
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 font-black text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100"
              onClick={addPlayer}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.players.map((player) => (
            <PlayerSettingsCard
              key={player.id}
              onDelete={(candidate) => void removePlayer(candidate)}
              onUpdate={(candidate) => void savePlayer(candidate)}
              player={player}
            />
          ))}
        </div>
      </section>

      <section className="pb-10">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-black text-slate-950">
              <ClipboardList className="h-6 w-6 text-sky-600" />
              Practice plans
            </h2>
            <p className="mt-1 font-bold text-stone-600">
              Create softball practice plans and add drills below.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label>
              <span className="sr-only">New plan name</span>
              <input
                aria-label="New plan name"
                className="min-h-12 w-full rounded-xl border border-slate-200 px-3 font-bold text-slate-950 outline-none focus:ring-4 focus:ring-sky-100"
                onChange={(event) => setNewPlanName(event.target.value)}
                placeholder="Plan name"
                value={newPlanName}
              />
            </label>
            <button
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 font-black text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100"
              onClick={() => void addTemplate()}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Add plan
            </button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.templates.map((template) => (
            <TemplateCard
              key={template.id}
              onSave={(draft) => void saveTemplate(draft)}
              template={template}
            />
          ))}
        </div>
      </section>
      </div>
    </main>
  );
}
