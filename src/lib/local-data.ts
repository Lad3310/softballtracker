import { SUMMER_MILESTONE_BADGE_CODES } from "@/lib/config";
import { createId, getAppDateKey, nowIso } from "@/lib/time";
import type {
  AppData,
  AppSettings,
  Badge,
  DrillTemplate,
  Player,
  PracticeSession,
} from "@/lib/types";

const LOCAL_DATA_KEY = "softball-tracker:data";
const QUEUED_SESSIONS_KEY = "softball-tracker:queued-sessions";

const TEMPLATE_SEEDS = [
  {
    id: "template-hitting",
    name: "Preset hitting",
    practice_type: "Game",
    items: [
      "dry swings: launch position",
      "no-stride tee swings",
      "regular tee swings",
      "inside pitch tee",
      "side soft toss: load, toss, swing",
      "side soft toss: game reps",
    ],
  },
  {
    id: "template-tee",
    name: "Preset tee",
    practice_type: "Tee Work",
    items: [
      "dry swings: launch position",
      "no-stride tee swings",
      "regular tee swings",
      "inside pitch tee",
    ],
  },
  {
    id: "template-timing",
    name: "Preset timing",
    practice_type: "Side Soft Toss",
    items: [
      "dry swings: launch position",
      "no-stride tee swings",
      "side soft toss: load, toss, swing",
      "side soft toss: game reps",
    ],
  },
  {
    id: "template-fielding",
    name: "Preset fielding",
    practice_type: "Fielding",
    items: ["ground balls", "fly balls", "throwing mechanics", "catching practice"],
  },
];

const BADGE_SEEDS = [
  [
    "ninety_minute_week",
    "90 Minute Week",
    "Practiced at least 90 approved minutes in one Monday-start week.",
    "90",
  ],
  [
    "three_day_streak",
    "3 Day Streak",
    "Logged approved practice on 3 consecutive New York calendar days.",
    "3",
  ],
  [
    "five_day_streak",
    "5 Day Streak",
    "Logged approved practice on 5 consecutive New York calendar days.",
    "5",
  ],
  [
    "tee_work_complete",
    "Tee Work Complete",
    "Logged Tee Work 3 times in one Monday-start week.",
    "TEE",
  ],
  [
    "soft_toss_complete",
    "Soft Toss Complete",
    "Logged Side Soft Toss 3 times in one Monday-start week.",
    "ST",
  ],
  [
    "balanced_hitter",
    "Balanced Hitter",
    "A switch hitter logged both left and right reps in one approved session.",
    "LR",
  ],
  ["summer_grinder", "Summer Grinder", "Reached 25% of the summer goal.", "25"],
  ["halfway_there", "Halfway There", "Reached 50% of the summer goal.", "50"],
  ["summer_goal_complete", "Summer Goal Complete", "Reached 100% of the summer goal.", "100"],
] as const;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function createSeedData(): AppData {
  const today = getAppDateKey();
  const year = today.slice(0, 4);
  const timestamp = nowIso();
  const settings: AppSettings = {
    id: true,
    require_parent_approval: true,
    created_at: timestamp,
    updated_at: timestamp,
  };
  // ASSUMPTION: Demo mode uses the names mentioned in the prompt only when Supabase env vars are missing; the production migration does not seed players.
  const players: Player[] = ["Roya", "Rayna"].map((name, index) => ({
    id: `player-${name.toLowerCase()}`,
    name,
    display_order: index + 1,
    handedness: index === 0 ? "R" : "switch",
    weekly_goal_minutes: 90,
    summer_goal_minutes: 1200,
    summer_start_date: `${year}-06-01`,
    summer_end_date: `${year}-08-31`,
    created_at: timestamp,
  }));
  const templates: DrillTemplate[] = TEMPLATE_SEEDS.map((template) => ({
    id: template.id,
    name: template.name,
    practice_type: template.practice_type,
    editable: false,
    created_at: timestamp,
    items: template.items.map((label, index) => ({
      id: `${template.id}-item-${index + 1}`,
      template_id: template.id,
      label,
      sort_order: (index + 1) * 10,
      created_at: timestamp,
    })),
  }));
  const badges: Badge[] = BADGE_SEEDS.map(([code, title, description, icon]) => ({
    id: `badge-${code}`,
    code,
    title,
    description,
    icon,
    created_at: timestamp,
  }));

  return {
    players,
    sessions: [],
    templates,
    badges,
    playerBadges: [],
    settings,
  };
}

export function loadLocalData() {
  if (!canUseStorage()) {
    return createSeedData();
  }

  const raw = window.localStorage.getItem(LOCAL_DATA_KEY);

  if (!raw) {
    const data = createSeedData();
    saveLocalData(data);
    return data;
  }

  try {
    const parsed = JSON.parse(raw) as AppData;

    return {
      ...createSeedData(),
      ...parsed,
      settings: parsed.settings ?? createSeedData().settings,
    };
  } catch {
    const data = createSeedData();
    saveLocalData(data);
    return data;
  }
}

export function saveLocalData(data: AppData) {
  if (canUseStorage()) {
    window.localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data));
  }
}

export function loadQueuedSessions() {
  if (!canUseStorage()) {
    return [] as PracticeSession[];
  }

  try {
    return JSON.parse(window.localStorage.getItem(QUEUED_SESSIONS_KEY) ?? "[]") as PracticeSession[];
  } catch {
    return [];
  }
}

export function saveQueuedSessions(sessions: PracticeSession[]) {
  if (canUseStorage()) {
    window.localStorage.setItem(
      QUEUED_SESSIONS_KEY,
      JSON.stringify(sessions.filter((session) => session.sync_state !== "synced")),
    );
  }
}

export function clearSyncedQueuedSession(sessionId: string) {
  const remaining = loadQueuedSessions().filter((session) => session.id !== sessionId);
  saveQueuedSessions(remaining);
}

export function cloneData(data: AppData): AppData {
  return JSON.parse(JSON.stringify(data)) as AppData;
}

export function makeLocalPracticeSession(input: {
  player_id: string;
  practice_type: string;
  minutes: number;
  feeling?: string | null;
  focus_tag?: string | null;
  notes?: string | null;
  hitting_side?: "L" | "R" | "both" | null;
  session_date: string;
  require_parent_approval: boolean;
}) {
  const timestamp = nowIso();
  const id = createId();
  const approved = !input.require_parent_approval;

  return {
    id,
    player_id: input.player_id,
    practice_type: input.practice_type,
    minutes: input.minutes,
    feeling: input.feeling ?? null,
    focus_tag: input.focus_tag ?? null,
    notes: input.notes ?? null,
    status: approved ? "approved" : "pending",
    approved_by: approved ? "auto" : null,
    approved_at: approved ? timestamp : null,
    rejected_reason: null,
    hitting_side: input.hitting_side ?? null,
    session_date: input.session_date,
    created_at: timestamp,
    drills: [],
    sync_state: "queued",
  } satisfies PracticeSession;
}

export function isPermanentBadgeCode(code: string) {
  return SUMMER_MILESTONE_BADGE_CODES.some((candidate) => candidate === code);
}
