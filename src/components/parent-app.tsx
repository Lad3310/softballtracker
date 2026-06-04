"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Edit3,
  Frown,
  Medal,
  Plus,
  Save,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { FEELINGS, FOCUS_TAGS } from "@/lib/config";
import { recomputePlayerBadges } from "@/lib/badges";
import {
  deletePlayerRemote,
  deleteSessionRemote,
  loadAppData,
  persistLocalState,
  recomputeBadgesForPlayer,
  replacePlayerSportsRemote,
  replaceBadgesRemote,
  savePlayerRemote,
  saveSessionRemote,
  saveSettingsRemote,
  saveSportRemote,
  saveTemplateRemote,
} from "@/lib/data-client";
import { createId, formatShortDate, getAppDateKey, nowIso } from "@/lib/time";
import { getMaxStreak, getSummerProgress, getWeeklyProgress } from "@/lib/progress";
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
  Sport,
} from "@/lib/types";

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ProgressBar({ value, tone = "green" }: { value: number; tone?: "green" | "blue" }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
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

function sessionStatusStyle(status: SessionStatus) {
  if (status === "approved") {
    return "border-supabase-border bg-supabase-50 text-supabase-800";
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

  return (
    <div className="fixed inset-0 z-20 overflow-auto bg-stone-950/40 p-4">
      <section className="mx-auto max-w-2xl rounded-lg bg-white p-5 shadow-xl">
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
              min={1}
              onChange={(event) =>
                setDraft({ ...draft, minutes: Math.max(1, Number(event.target.value)) })
              }
              type="number"
              value={draft.minutes}
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

        <div className="mt-4 rounded-lg border border-stone-200 p-3">
          <h3 className="font-black text-stone-950">Drills</h3>
          <div className="mt-3 grid gap-2">
            {draft.drills.map((drill, index) => (
              <div className="grid gap-2 sm:grid-cols-[auto_1fr]" key={drill.id}>
                <button
                  className={classNames(
                    "flex min-h-11 items-center justify-center rounded-md border px-3 font-black",
                    drill.completed
                      ? "border-supabase-border bg-supabase-50 text-supabase-800"
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
            className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-950 px-4 font-black text-white"
            onClick={() => onSave(draft)}
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
  const sport = data.sports.find((candidate) => candidate.id === session.sport_id);

  return (
    <article className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-amber-700">Pending</p>
          <h3 className="mt-1 text-xl font-black text-stone-950">
            {player?.name ?? "Athlete"} - {sport?.name ?? "Sport"} - {session.practice_type}
          </h3>
          <p className="mt-1 font-bold text-stone-600">
            {session.minutes} min on {formatShortDate(session.session_date)}
            {session.sync_state === "queued" ? " - saved on device" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex min-h-11 items-center gap-2 rounded-md border border-supabase-border bg-supabase px-3 font-black text-stone-950"
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

function PlayerSettingsCard({
  player,
  sports,
  assignments,
  onDelete,
  onToggleSport,
  onUpdate,
}: {
  player: Player;
  sports: Sport[];
  assignments: PlayerSport[];
  onDelete: (player: Player) => void;
  onToggleSport: (player: Player, sportId: string) => void;
  onUpdate: (player: Player) => void;
}) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
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
            onBlur={(event) =>
              onUpdate({ ...player, weekly_goal_minutes: Math.max(1, Number(event.target.value)) })
            }
            type="number"
            defaultValue={player.weekly_goal_minutes}
          />
        </label>
        <label className="grid gap-1 text-sm font-black text-stone-600">
          Season goal
          <input
            className="min-h-11 rounded-md border border-stone-200 px-3 text-base font-bold text-stone-950"
            min={1}
            onBlur={(event) =>
              onUpdate({ ...player, summer_goal_minutes: Math.max(1, Number(event.target.value)) })
            }
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
      <div className="mt-4">
        <p className="text-sm font-black text-stone-600">Sports</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {sports.map((sport) => {
            const selected = assignments.some((assignment) => assignment.sport_id === sport.id);

            return (
              <button
                aria-pressed={selected}
                className={classNames(
                  "min-h-10 rounded-md border px-3 text-sm font-black",
                  selected
                    ? "border-supabase-border bg-supabase-50 text-supabase-800"
                    : "border-stone-200 bg-white text-stone-500",
                )}
                key={sport.id}
                onClick={() => onToggleSport(player, sport.id)}
                type="button"
              >
                {selected ? "Selected: " : ""}
                {sport.name}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function TemplateCard({
  template,
  sport,
  onSave,
}: {
  template: DrillTemplate;
  sport: Sport | undefined;
  onSave: (template: DrillTemplate) => void;
}) {
  const [draft, setDraft] = useState(template);

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-black uppercase tracking-wide text-supabase-800">
        {sport?.name ?? "Sport"}
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
  const [result, setResult] = useState<AppDataResult | null>(null);
  const [editingSession, setEditingSession] = useState<PracticeSession | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newSportName, setNewSportName] = useState("");
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanSportId, setNewPlanSportId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
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
          setError(caught instanceof Error ? caught.message : "Could not load parent data.");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

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
      summer_end_date: `${year}-08-31`,
      created_at: timestamp,
    };
    const defaultSport = data.sports[0];
    const assignment: PlayerSport | null = defaultSport
      ? {
          player_id: player.id,
          sport_id: defaultSport.id,
          created_at: timestamp,
        }
      : null;
    const nextData = {
      ...data,
      players: [...data.players, player],
      playerSports: assignment ? [...data.playerSports, assignment] : data.playerSports,
    };

    setNewPlayerName("");
    updateData(nextData);
    void (async () => {
      try {
        if (mode === "supabase") {
          await savePlayerRemote(player);
          await replacePlayerSportsRemote(player.id, assignment ? [assignment] : []);
        }
        setNotice("Athlete added.");
      } catch (caught) {
        setNotice(caught instanceof Error ? caught.message : "Athlete saved on this device.");
      }
    })();
  };

  const togglePlayerSport = async (player: Player, sportId: string) => {
    if (!data) {
      return;
    }

    const current = data.playerSports.filter((assignment) => assignment.player_id === player.id);
    const selected = current.some((assignment) => assignment.sport_id === sportId);
    const nextAssignments = selected
      ? current.filter((assignment) => assignment.sport_id !== sportId)
      : [...current, { player_id: player.id, sport_id: sportId, created_at: nowIso() }];
    const nextData = {
      ...data,
      playerSports: [
        ...data.playerSports.filter((assignment) => assignment.player_id !== player.id),
        ...nextAssignments,
      ],
    };
    updateData(nextData);

    try {
      if (mode === "supabase") {
        await replacePlayerSportsRemote(player.id, nextAssignments);
      }
      setNotice("Athlete sports saved.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Sports saved on this device.");
    }
  };

  const addSport = async () => {
    if (!data || !data.family || !newSportName.trim()) {
      return;
    }

    const name = newSportName.trim();

    if (data.sports.some((sport) => sport.name.toLowerCase() === name.toLowerCase())) {
      setNotice("That sport is already available.");
      return;
    }

    const sport: Sport = {
      id: createId(),
      family_id: data.family.id,
      name,
      icon: name.slice(0, 2).toUpperCase(),
      display_order: data.sports.length * 10 + 10,
      created_at: nowIso(),
    };
    const nextData = { ...data, sports: [...data.sports, sport] };
    setNewSportName("");
    updateData(nextData);

    try {
      if (mode === "supabase") {
        await saveSportRemote(sport);
      }
      setNotice("Custom sport added.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Sport saved on this device.");
    }
  };

  const addTemplate = async () => {
    if (!data || !data.family || !newPlanName.trim()) {
      return;
    }

    const sportId = newPlanSportId || data.sports[0]?.id;

    if (!sportId) {
      setNotice("Add a sport before creating a practice plan.");
      return;
    }

    const timestamp = nowIso();
    const template: DrillTemplate = {
      id: createId(),
      family_id: data.family.id,
      sport_id: sportId,
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

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-50 p-4">
        <section className="max-w-md rounded-lg border border-rose-200 bg-white p-6 text-center shadow-sm">
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
        <section className="rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm">
          <Settings className="mx-auto h-10 w-10 animate-pulse text-supabase-700" />
          <p className="mt-3 text-xl font-black text-stone-950">Loading parent tools.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-4 sm:px-6">
      {editingSession ? (
        <SessionEditor
          onCancel={() => setEditingSession(null)}
          onSave={(session) => void saveSessionChange(session)}
          session={editingSession}
        />
      ) : null}

      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link
            className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm"
            href="/"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-supabase-800">
              Parent
            </p>
            <h1 className="text-3xl font-black text-stone-950 sm:text-5xl">
              Practice dashboard
            </h1>
            <p className="mt-1 font-bold text-stone-600">
              Goals, approvals, and recent practice
            </p>
          </div>
        </div>
        <button
          className={classNames(
            "min-h-11 rounded-md border px-4 font-black",
            data.settings.require_parent_approval
              ? "border-supabase-border bg-supabase-50 text-supabase-800"
              : "border-stone-200 bg-white text-stone-700",
          )}
          onClick={toggleApproval}
          type="button"
        >
          Approval {data.settings.require_parent_approval ? "on" : "off"}
        </button>
      </header>

      {notice ? (
        <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 font-bold text-sky-950">
          {notice}
        </div>
      ) : null}

      {mode === "local" ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 font-bold text-amber-950">
          Supabase is not connected in this build. Changes are saved only on this device.
        </div>
      ) : null}

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-stone-500">Pending</p>
          <p className="mt-2 text-4xl font-black text-stone-950">{pendingSessions.length}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-stone-500">Athletes</p>
          <p className="mt-2 text-4xl font-black text-stone-950">{data.players.length}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-stone-500">Sessions</p>
          <p className="mt-2 text-4xl font-black text-stone-950">{data.sessions.length}</p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-black text-stone-950">Athlete progress</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.players.map((player) => {
            const weekly = getWeeklyProgress(player, data.sessions, today);
            const summer = getSummerProgress(player, data.sessions, today);
            const streak = getMaxStreak(player.id, data.sessions);
            const badges = data.playerBadges.filter((badge) => badge.player_id === player.id);

            return (
              <article
                className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
                key={player.id}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-2xl font-black text-stone-950">{player.name}</h3>
                  <div className="flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-sm font-black text-amber-800">
                    <Medal className="h-4 w-4" />
                    {badges.length}
                  </div>
                </div>
                <div className="grid gap-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm font-black text-stone-600">
                      <span>Week</span>
                      <span>
                        {weekly.minutes}/{player.weekly_goal_minutes}
                      </span>
                    </div>
                    <ProgressBar value={weekly.percent} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm font-black text-stone-600">
                      <span>Season</span>
                      <span>
                        {summer.minutes}/{player.summer_goal_minutes}
                      </span>
                    </div>
                    <ProgressBar tone="blue" value={summer.percent} />
                  </div>
                  <p className="font-bold text-stone-600">Current best streak: {streak} days</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-black text-stone-950">Review</h2>
        {pendingSessions.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-white p-4 font-bold text-stone-600">
            No sessions waiting.
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
        <h2 className="mb-3 text-2xl font-black text-stone-950">Recent sessions</h2>
        <div className="grid gap-2">
          {recentSessions.map((session) => {
            const player = data.players.find((candidate) => candidate.id === session.player_id);
            const sport = data.sports.find((candidate) => candidate.id === session.sport_id);

            return (
              <article
                className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[1fr_auto]"
                key={session.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-stone-950">
                      {player?.name ?? "Athlete"} - {sport?.name ?? "Sport"} - {session.practice_type}
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
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 text-stone-700"
                    onClick={() => setEditingSession(session)}
                    type="button"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-rose-200 text-rose-700"
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
            <h2 className="text-2xl font-black text-stone-950">Sports</h2>
            <p className="mt-1 font-bold text-stone-600">
              Starter sports are ready to use. Add a private custom sport here.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label>
              <span className="sr-only">Custom sport name</span>
              <input
                aria-label="Custom sport name"
                className="min-h-11 w-full rounded-md border border-stone-200 px-3 font-bold text-stone-950"
                onChange={(event) => setNewSportName(event.target.value)}
                placeholder="Custom sport"
                value={newSportName}
              />
            </label>
            <button
              className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-950 px-3 font-black text-white"
              onClick={() => void addSport()}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Add sport
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.sports.map((sport) => (
            <span
              className="rounded-full border border-supabase-border bg-supabase-50 px-3 py-2 font-black text-supabase-800"
              key={sport.id}
            >
              {sport.icon} {sport.name}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl font-black text-stone-950">Athletes and goals</h2>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label>
              <span className="sr-only">Athlete name</span>
              <input
                aria-label="Athlete name"
                className="min-h-11 w-full rounded-md border border-stone-200 px-3 font-bold text-stone-950"
                onChange={(event) => setNewPlayerName(event.target.value)}
                placeholder="Athlete name"
                value={newPlayerName}
              />
            </label>
            <button
              className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-950 px-3 font-black text-white"
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
              assignments={data.playerSports.filter(
                (assignment) => assignment.player_id === player.id,
              )}
              onDelete={(candidate) => void removePlayer(candidate)}
              onToggleSport={(candidate, sportId) => void togglePlayerSport(candidate, sportId)}
              onUpdate={(candidate) => void savePlayer(candidate)}
              player={player}
              sports={data.sports}
            />
          ))}
        </div>
      </section>

      <section className="pb-10">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-black text-stone-950">
              <ClipboardList className="h-6 w-6" />
              Practice plans
            </h2>
            <p className="mt-1 font-bold text-stone-600">
              Choose a sport, name the plan, then add drills below.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto]">
            <label>
              <span className="sr-only">Plan sport</span>
              <select
                aria-label="Plan sport"
                className="min-h-11 w-full rounded-md border border-stone-200 px-3 font-bold text-stone-950"
                onChange={(event) => setNewPlanSportId(event.target.value)}
                value={newPlanSportId || data.sports[0]?.id || ""}
              >
                {data.sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">New plan name</span>
              <input
                aria-label="New plan name"
                className="min-h-11 w-full rounded-md border border-stone-200 px-3 font-bold text-stone-950"
                onChange={(event) => setNewPlanName(event.target.value)}
                placeholder="Plan name"
                value={newPlanName}
              />
            </label>
            <button
              className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-950 px-3 font-black text-white"
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
              sport={data.sports.find((sport) => sport.id === template.sport_id)}
              template={template}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
