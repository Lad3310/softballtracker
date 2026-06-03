"use client";

import { recomputePlayerBadges } from "@/lib/badges";
import {
  clearSyncedQueuedSession,
  loadLocalData,
  loadQueuedSessions,
  makeLocalPracticeSession,
  saveLocalData,
  saveQueuedSessions,
} from "@/lib/local-data";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { createId, getAppDateKey, nowIso } from "@/lib/time";
import type {
  AppData,
  AppDataResult,
  AppSettings,
  DrillTemplate,
  DrillTemplateItem,
  LogSessionInput,
  Player,
  PlayerBadge,
  PracticeSession,
  PracticeSessionDrill,
} from "@/lib/types";

function mergeQueuedSessions(data: AppData) {
  const queued = loadQueuedSessions();
  const existingIds = new Set(data.sessions.map((session) => session.id));

  return {
    ...data,
    sessions: [
      ...queued.filter((session) => !existingIds.has(session.id)),
      ...data.sessions,
    ].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

function sessionRow(session: PracticeSession) {
  return {
    id: session.id,
    player_id: session.player_id,
    practice_type: session.practice_type,
    minutes: session.minutes,
    feeling: session.feeling,
    focus_tag: session.focus_tag,
    notes: session.notes,
    status: session.status,
    approved_by: session.approved_by,
    approved_at: session.approved_at,
    rejected_reason: session.rejected_reason,
    hitting_side: session.hitting_side,
    session_date: session.session_date,
    created_at: session.created_at,
  };
}

function drillRows(session: PracticeSession) {
  return session.drills.map((drill) => ({
    id: drill.id,
    session_id: session.id,
    drill_label: drill.drill_label,
    completed: drill.completed,
    created_at: drill.created_at,
  }));
}

export async function loadAppData(): Promise<AppDataResult> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { data: loadLocalData(), mode: "local" };
  }

  const [
    playersResult,
    sessionsResult,
    drillsResult,
    templatesResult,
    templateItemsResult,
    badgesResult,
    playerBadgesResult,
    settingsResult,
  ] = await Promise.all([
    supabase.from("players").select("*").order("display_order", { ascending: true }),
    supabase.from("practice_sessions").select("*").order("created_at", { ascending: false }),
    supabase.from("practice_session_drills").select("*"),
    supabase.from("drill_templates").select("*").order("practice_type", { ascending: true }),
    supabase.from("drill_template_items").select("*").order("sort_order", { ascending: true }),
    supabase.from("badges").select("*").order("title", { ascending: true }),
    supabase.from("player_badges").select("*").order("earned_at", { ascending: true }),
    supabase.from("app_settings").select("*").limit(1).maybeSingle(),
  ]);

  const error = [
    playersResult.error,
    sessionsResult.error,
    drillsResult.error,
    templatesResult.error,
    templateItemsResult.error,
    badgesResult.error,
    playerBadgesResult.error,
    settingsResult.error,
  ].find(Boolean);

  if (error) {
    throw error;
  }

  const drills = (drillsResult.data ?? []) as PracticeSessionDrill[];
  const templateItems = (templateItemsResult.data ?? []) as DrillTemplateItem[];
  const sessions = ((sessionsResult.data ?? []) as Omit<PracticeSession, "drills">[]).map(
    (session) => ({
      ...session,
      drills: drills.filter((drill) => drill.session_id === session.id),
      sync_state: "synced" as const,
    }),
  );
  const templates = ((templatesResult.data ?? []) as Omit<DrillTemplate, "items">[]).map(
    (template) => ({
      ...template,
      items: templateItems.filter((item) => item.template_id === template.id),
    }),
  );
  const settings =
    (settingsResult.data as AppSettings | null) ??
    ({
      id: true,
      require_parent_approval: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    } satisfies AppSettings);
  const data: AppData = {
    players: (playersResult.data ?? []) as Player[],
    sessions,
    templates,
    badges: badgesResult.data ?? [],
    playerBadges: playerBadgesResult.data ?? [],
    settings,
  };

  return { data: mergeQueuedSessions(data), mode: "supabase" };
}

export function createPracticeSessionFromInput(input: LogSessionInput) {
  const session = makeLocalPracticeSession({
    player_id: input.player.id,
    practice_type: input.practice_type,
    minutes: input.minutes,
    feeling: input.feeling ?? null,
    focus_tag: input.focus_tag ?? null,
    notes: input.notes ?? null,
    hitting_side: input.hitting_side ?? null,
    session_date: input.session_date ?? getAppDateKey(),
    require_parent_approval: input.require_parent_approval,
  });

  return {
    ...session,
    drills: input.drills.map((drill) => ({
      id: createId(),
      session_id: session.id,
      drill_label: drill.label,
      completed: drill.completed,
      created_at: session.created_at,
    })),
  };
}

export async function pushSessionToSupabase(session: PracticeSession) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { ...session, sync_state: "queued" as const };
  }

  const sessionResult = await supabase.from("practice_sessions").upsert(sessionRow(session));

  if (sessionResult.error) {
    throw sessionResult.error;
  }

  if (session.drills.length > 0) {
    const drillsResult = await supabase
      .from("practice_session_drills")
      .upsert(drillRows(session));

    if (drillsResult.error) {
      throw drillsResult.error;
    }
  }

  clearSyncedQueuedSession(session.id);

  return { ...session, sync_state: "synced" as const };
}

export async function saveSessionRemote(session: PracticeSession) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const sessionResult = await supabase.from("practice_sessions").upsert(sessionRow(session));

  if (sessionResult.error) {
    throw sessionResult.error;
  }

  const deleteDrills = await supabase
    .from("practice_session_drills")
    .delete()
    .eq("session_id", session.id);

  if (deleteDrills.error) {
    throw deleteDrills.error;
  }

  if (session.drills.length > 0) {
    const insertDrills = await supabase
      .from("practice_session_drills")
      .insert(drillRows(session));

    if (insertDrills.error) {
      throw insertDrills.error;
    }
  }
}

export async function deleteSessionRemote(sessionId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const result = await supabase.from("practice_sessions").delete().eq("id", sessionId);

  if (result.error) {
    throw result.error;
  }
}

export async function savePlayerRemote(player: Player) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const result = await supabase.from("players").upsert(player);

  if (result.error) {
    throw result.error;
  }
}

export async function deletePlayerRemote(playerId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const result = await supabase.from("players").delete().eq("id", playerId);

  if (result.error) {
    throw result.error;
  }
}

export async function saveSettingsRemote(settings: AppSettings) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const result = await supabase.from("app_settings").upsert(settings);

  if (result.error) {
    throw result.error;
  }
}

export async function replaceBadgesRemote(playerId: string, badges: PlayerBadge[]) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const deleteResult = await supabase.from("player_badges").delete().eq("player_id", playerId);

  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (badges.length > 0) {
    const insertResult = await supabase.from("player_badges").insert(badges);

    if (insertResult.error) {
      throw insertResult.error;
    }
  }
}

export async function saveTemplateRemote(template: DrillTemplate) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const templateRow = {
    id: template.id,
    name: template.name,
    practice_type: template.practice_type,
    editable: template.editable,
    created_at: template.created_at,
  };
  const templateResult = await supabase.from("drill_templates").upsert(templateRow);

  if (templateResult.error) {
    throw templateResult.error;
  }

  const deleteResult = await supabase
    .from("drill_template_items")
    .delete()
    .eq("template_id", template.id);

  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (template.items.length > 0) {
    const insertResult = await supabase.from("drill_template_items").insert(template.items);

    if (insertResult.error) {
      throw insertResult.error;
    }
  }
}

export function persistLocalState(data: AppData, mode: "local" | "supabase") {
  if (mode === "local") {
    saveLocalData(data);
  } else {
    saveQueuedSessions(data.sessions.filter((session) => session.sync_state !== "synced"));
  }
}

export function recomputeBadgesForPlayer(data: AppData, playerId: string) {
  const player = data.players.find((candidate) => candidate.id === playerId);

  if (!player) {
    return data;
  }

  const otherBadges = data.playerBadges.filter((badge) => badge.player_id !== playerId);
  const nextPlayerBadges = recomputePlayerBadges(
    player,
    data.sessions,
    data.badges,
    data.playerBadges.filter((badge) => badge.player_id === playerId),
  );

  return {
    ...data,
    playerBadges: [...otherBadges, ...nextPlayerBadges],
  };
}
