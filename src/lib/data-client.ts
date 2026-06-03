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
  Family,
  FamilyMember,
  LogSessionInput,
  Player,
  PlayerBadge,
  PracticeSession,
  PracticeSessionDrill,
} from "@/lib/types";

type Supabase = NonNullable<ReturnType<typeof getSupabaseBrowserClient>>;

const TABLES = {
  appSettings: "softball_app_settings",
  badges: "softball_badges",
  drillTemplateItems: "softball_drill_template_items",
  drillTemplates: "softball_drill_templates",
  families: "softball_families",
  familyMembers: "softball_family_members",
  playerBadges: "softball_player_badges",
  players: "softball_players",
  practiceSessionDrills: "softball_practice_session_drills",
  practiceSessions: "softball_practice_sessions",
} as const;

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

async function ensureFamilySettings(supabase: Supabase, familyId: string) {
  const existing = await supabase
    .from(TABLES.appSettings)
    .select("*")
    .eq("family_id", familyId)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data) {
    return existing.data as AppSettings;
  }

  const timestamp = nowIso();
  const settings = {
    id: createId(),
    family_id: familyId,
    require_parent_approval: true,
    created_at: timestamp,
    updated_at: timestamp,
  } satisfies AppSettings;
  const inserted = await supabase.from(TABLES.appSettings).insert(settings).select("*").single();

  if (inserted.error) {
    throw inserted.error;
  }

  return inserted.data as AppSettings;
}

async function ensureFamilyTemplates(supabase: Supabase, familyId: string) {
  const familyTemplates = await supabase
    .from(TABLES.drillTemplates)
    .select("id")
    .eq("family_id", familyId)
    .limit(1);

  if (familyTemplates.error) {
    throw familyTemplates.error;
  }

  if ((familyTemplates.data ?? []).length > 0) {
    return;
  }

  const globals = await supabase
    .from(TABLES.drillTemplates)
    .select("*")
    .is("family_id", null)
    .order("practice_type", { ascending: true });

  if (globals.error) {
    throw globals.error;
  }

  const sourceTemplates = (globals.data ?? []) as Array<Omit<DrillTemplate, "items">>;

  if (sourceTemplates.length === 0) {
    return;
  }

  const sourceIds = sourceTemplates.map((template) => template.id);
  const items = await supabase
    .from(TABLES.drillTemplateItems)
    .select("*")
    .in("template_id", sourceIds)
    .order("sort_order", { ascending: true });

  if (items.error) {
    throw items.error;
  }

  const timestamp = nowIso();
  const idMap = new Map<string, string>();
  const templateRows = sourceTemplates.map((template) => {
    const id = createId();
    idMap.set(template.id, id);

    return {
      id,
      family_id: familyId,
      name: template.name,
      practice_type: template.practice_type,
      editable: true,
      created_at: timestamp,
    };
  });
  const itemRows = ((items.data ?? []) as DrillTemplateItem[])
    .map((item) => {
      const templateId = idMap.get(item.template_id);

      if (!templateId) {
        return null;
      }

      return {
        id: createId(),
        template_id: templateId,
        label: item.label,
        sort_order: item.sort_order,
        created_at: timestamp,
      };
    })
    .filter(
      (item): item is Omit<DrillTemplateItem, "template_id"> & { template_id: string } =>
        Boolean(item),
    );

  const templateInsert = await supabase.from(TABLES.drillTemplates).insert(templateRows);

  if (templateInsert.error) {
    throw templateInsert.error;
  }

  if (itemRows.length > 0) {
    const itemInsert = await supabase.from(TABLES.drillTemplateItems).insert(itemRows);

    if (itemInsert.error) {
      throw itemInsert.error;
    }
  }
}

async function ensureFamilyWorkspace(supabase: Supabase) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Please sign in as a parent.");
  }

  const membership = await supabase
    .from(TABLES.familyMembers)
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership.error) {
    throw membership.error;
  }

  if (membership.data) {
    const familyResult = await supabase
      .from(TABLES.families)
      .select("*")
      .eq("id", (membership.data as FamilyMember).family_id)
      .single();

    if (familyResult.error) {
      throw familyResult.error;
    }

    const family = familyResult.data as Family;
    const settings = await ensureFamilySettings(supabase, family.id);
    await ensureFamilyTemplates(supabase, family.id);

    return { family, settings };
  }

  const timestamp = nowIso();
  const familyId = createId();
  const familyInsert = await supabase
    .from(TABLES.families)
    .insert({
      id: familyId,
      name: "My softball family",
      created_by: user.id,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select("*")
    .single();

  if (familyInsert.error) {
    throw familyInsert.error;
  }

  const memberInsert = await supabase.from(TABLES.familyMembers).insert({
    id: createId(),
    family_id: familyId,
    user_id: user.id,
    role: "owner",
    created_at: timestamp,
  });

  if (memberInsert.error) {
    throw memberInsert.error;
  }

  const family = familyInsert.data as Family;
  const settings = await ensureFamilySettings(supabase, family.id);
  await ensureFamilyTemplates(supabase, family.id);

  return { family, settings };
}

function chooseFamilyTemplates(templates: DrillTemplate[], familyId: string) {
  const byType = new Map<string, DrillTemplate>();

  for (const template of templates) {
    const existing = byType.get(template.practice_type);

    if (!existing || template.family_id === familyId) {
      byType.set(template.practice_type, template);
    }
  }

  return Array.from(byType.values()).sort((a, b) =>
    a.practice_type.localeCompare(b.practice_type),
  );
}

export async function loadAppData(): Promise<AppDataResult> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { data: loadLocalData(), mode: "local" };
  }

  const { family, settings } = await ensureFamilyWorkspace(supabase);
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
    supabase
      .from(TABLES.players)
      .select("*")
      .eq("family_id", family.id)
      .order("display_order", { ascending: true }),
    supabase.from(TABLES.practiceSessions).select("*").order("created_at", { ascending: false }),
    supabase.from(TABLES.practiceSessionDrills).select("*"),
    supabase
      .from(TABLES.drillTemplates)
      .select("*")
      .or(`family_id.is.null,family_id.eq.${family.id}`)
      .order("practice_type", { ascending: true }),
    supabase.from(TABLES.drillTemplateItems).select("*").order("sort_order", { ascending: true }),
    supabase.from(TABLES.badges).select("*").order("title", { ascending: true }),
    supabase.from(TABLES.playerBadges).select("*").order("earned_at", { ascending: true }),
    supabase.from(TABLES.appSettings).select("*").eq("family_id", family.id).maybeSingle(),
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
  const templates = chooseFamilyTemplates(
    ((templatesResult.data ?? []) as Omit<DrillTemplate, "items">[]).map((template) => ({
      ...template,
      items: templateItems.filter((item) => item.template_id === template.id),
    })),
    family.id,
  );
  const activeSettings = (settingsResult.data as AppSettings | null) ?? settings;
  const data: AppData = {
    family,
    players: (playersResult.data ?? []) as Player[],
    sessions,
    templates,
    badges: badgesResult.data ?? [],
    playerBadges: playerBadgesResult.data ?? [],
    settings: activeSettings,
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

  const sessionResult = await supabase.from(TABLES.practiceSessions).upsert(sessionRow(session));

  if (sessionResult.error) {
    throw sessionResult.error;
  }

  if (session.drills.length > 0) {
    const drillsResult = await supabase
      .from(TABLES.practiceSessionDrills)
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

  const sessionResult = await supabase.from(TABLES.practiceSessions).upsert(sessionRow(session));

  if (sessionResult.error) {
    throw sessionResult.error;
  }

  const deleteDrills = await supabase
    .from(TABLES.practiceSessionDrills)
    .delete()
    .eq("session_id", session.id);

  if (deleteDrills.error) {
    throw deleteDrills.error;
  }

  if (session.drills.length > 0) {
    const insertDrills = await supabase
      .from(TABLES.practiceSessionDrills)
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

  const result = await supabase.from(TABLES.practiceSessions).delete().eq("id", sessionId);

  if (result.error) {
    throw result.error;
  }
}

export async function savePlayerRemote(player: Player) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const result = await supabase.from(TABLES.players).upsert(player);

  if (result.error) {
    throw result.error;
  }
}

export async function deletePlayerRemote(playerId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const result = await supabase.from(TABLES.players).delete().eq("id", playerId);

  if (result.error) {
    throw result.error;
  }
}

export async function saveSettingsRemote(settings: AppSettings) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const result = await supabase.from(TABLES.appSettings).upsert(settings);

  if (result.error) {
    throw result.error;
  }
}

export async function replaceBadgesRemote(playerId: string, badges: PlayerBadge[]) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const deleteResult = await supabase.from(TABLES.playerBadges).delete().eq("player_id", playerId);

  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (badges.length > 0) {
    const insertResult = await supabase.from(TABLES.playerBadges).insert(badges);

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
    family_id: template.family_id,
    name: template.name,
    practice_type: template.practice_type,
    editable: template.editable,
    created_at: template.created_at,
  };
  const templateResult = await supabase.from(TABLES.drillTemplates).upsert(templateRow);

  if (templateResult.error) {
    throw templateResult.error;
  }

  const deleteResult = await supabase
    .from(TABLES.drillTemplateItems)
    .delete()
    .eq("template_id", template.id);

  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (template.items.length > 0) {
    const insertResult = await supabase.from(TABLES.drillTemplateItems).insert(template.items);

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
