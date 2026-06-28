import { SUMMER_MILESTONE_BADGE_CODES } from "@/lib/config";
import {
  readBrowserStorage,
  removeBrowserStorage,
  writeBrowserStorage,
} from "@/lib/browser-storage";
import { createId, getAppDateKey, nowIso } from "@/lib/time";
import type {
  AppData,
  AppSettings,
  Badge,
  DrillTemplate,
  Family,
  Player,
  PlayerSport,
  PracticeSession,
  Sport,
} from "@/lib/types";

const LOCAL_DATA_KEY = "softball-tracker:data";
const QUEUED_SESSIONS_KEY = "softball-tracker:queued-sessions";
const SOFTBALL_SPORT_ID = "10000000-0000-4000-8000-000000000001";

const SPORT_SEEDS = [[SOFTBALL_SPORT_ID, "Softball", "SB"]] as const;

const TEMPLATE_SEEDS = [
  {
    id: "template-hitting",
    sport_id: SOFTBALL_SPORT_ID,
    name: "Hitting: regular swings",
    practice_type: "Hitting Practice",
    items: [
      "grip and stance check",
      "dry swings: launch position",
      "step-and-swing load drill",
      "side soft toss: load, toss, swing",
      "side soft toss: game reps",
    ],
  },
  {
    id: "template-hips-first",
    sport_id: SOFTBALL_SPORT_ID,
    name: "Hitting: hips-first work",
    practice_type: "Hips-First Hitting",
    items: [
      "hips-first half turns",
      "step-and-swing load drill",
      "knob to knee",
      "hips-first tee challenge",
      "hold finish for one count",
    ],
  },
  {
    id: "template-tee",
    sport_id: SOFTBALL_SPORT_ID,
    name: "Hitting: tee work station",
    practice_type: "Tee Work",
    items: [
      "tee setup check",
      "no-stride tee swings",
      "hips-first tee challenge",
      "inside/middle/outside tee",
      "high-low tee path",
      "finish hold",
    ],
  },
  {
    id: "template-timing",
    sport_id: SOFTBALL_SPORT_ID,
    name: "Hitting: timing / soft toss",
    practice_type: "Soft Toss Timing",
    items: [
      "dry swings: launch position",
      "no-stride tee swings",
      "side soft toss: load, toss, swing",
      "side soft toss: game reps",
    ],
  },
  {
    id: "template-pitching",
    sport_id: SOFTBALL_SPORT_ID,
    name: "Pitching: 20-minute session",
    practice_type: "Pitching Session",
    items: [
      "warm-up throws and relaxed circles",
      "Power-Line Walk",
      "Power-K Freeze",
      "Walk-Through Pitch",
      "Three-Zone Target Game",
      "Finish & Field",
    ],
  },
  {
    id: "template-fielding",
    sport_id: SOFTBALL_SPORT_ID,
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
  ["summer_grinder", "Season Starter", "Reached 25% of the season goal.", "25"],
  ["halfway_there", "Halfway There", "Reached 50% of the season goal.", "50"],
  ["summer_goal_complete", "Season Goal Complete", "Reached 100% of the season goal.", "100"],
] as const;

export function createSeedData(): AppData {
  const today = getAppDateKey();
  const year = today.slice(0, 4);
  const timestamp = nowIso();
  const family: Family = {
    id: "family-local",
    name: "My family",
    created_by: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  const settings: AppSettings = {
    id: "settings-local",
    family_id: family.id,
    require_parent_approval: true,
    created_at: timestamp,
    updated_at: timestamp,
  };
  // ASSUMPTION: Local fallback uses the names mentioned in the prompt only when Supabase env vars are missing; the production migration does not seed players.
  const players: Player[] = ["Roya", "Rayna"].map((name, index) => ({
    id: `player-${name.toLowerCase()}`,
    family_id: family.id,
    name,
    display_order: index + 1,
    handedness: index === 0 ? "R" : "switch",
    weekly_goal_minutes: 90,
    summer_goal_minutes: 1200,
    summer_start_date: `${year}-06-01`,
    summer_end_date: `${year}-08-09`,
    created_at: timestamp,
  }));
  const templates: DrillTemplate[] = TEMPLATE_SEEDS.map((template) => ({
    id: template.id,
    family_id: family.id,
    sport_id: template.sport_id,
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
  const sports: Sport[] = SPORT_SEEDS.map(([id, name, icon], index) => ({
    id,
    family_id: null,
    name,
    icon,
    display_order: (index + 1) * 10,
    created_at: timestamp,
  }));
  const playerSports: PlayerSport[] = players.map((player) => ({
    player_id: player.id,
    sport_id: SOFTBALL_SPORT_ID,
    created_at: timestamp,
  }));

  return {
    family,
    players,
    sports,
    playerSports,
    sessions: [],
    templates,
    badges,
    playerBadges: [],
    settings,
  };
}

export function loadLocalData() {
  const stored = loadStoredLocalData();

  if (stored) {
    return stored;
  }

  const data = createSeedData();
  saveLocalData(data);
  return data;
}

export function loadStoredLocalData() {
  const raw = readBrowserStorage(LOCAL_DATA_KEY);

  if (!raw) {
    return null;
  }

  try {
    const seed = createSeedData();
    const parsed = JSON.parse(raw) as AppData;
    const sessions = (parsed.sessions ?? [])
      .map((session) => ({
        ...session,
        sport_id: session.sport_id ?? SOFTBALL_SPORT_ID,
      }))
      .filter((session) => session.sport_id === SOFTBALL_SPORT_ID);
    const storedSports = (parsed.sports ?? []).filter(
      (sport) => sport.id === SOFTBALL_SPORT_ID,
    );
    const sports = [
      ...storedSports,
      ...seed.sports.filter(
        (seedSport) => !storedSports.some((storedSport) => storedSport.id === seedSport.id),
      ),
    ];
    const storedTemplates = (parsed.templates ?? [])
      .map((template) => ({
        ...template,
        sport_id: template.sport_id ?? SOFTBALL_SPORT_ID,
      }))
      .filter((template) => template.sport_id === SOFTBALL_SPORT_ID);
    const templateKeys = new Set(
      storedTemplates.map((template) => `${template.sport_id}:${template.practice_type}`),
    );
    const templates = [
      ...storedTemplates,
      ...seed.templates.filter(
        (template) => !templateKeys.has(`${template.sport_id}:${template.practice_type}`),
      ),
    ];

    return {
      ...seed,
      ...parsed,
      sports,
      playerSports: (parsed.playerSports ?? seed.playerSports).filter(
        (playerSport) => playerSport.sport_id === SOFTBALL_SPORT_ID,
      ),
      sessions,
      templates,
      settings: parsed.settings ?? seed.settings,
    };
  } catch {
    return null;
  }
}

export function saveLocalData(data: AppData) {
  writeBrowserStorage(LOCAL_DATA_KEY, JSON.stringify(data));
}

export function clearLocalData() {
  removeBrowserStorage(LOCAL_DATA_KEY);
}

export function loadQueuedSessions() {
  try {
    return (
      JSON.parse(readBrowserStorage(QUEUED_SESSIONS_KEY) ?? "[]") as PracticeSession[]
    )
      .map((session) => ({ ...session, sport_id: session.sport_id ?? SOFTBALL_SPORT_ID }))
      .filter((session) => session.sport_id === SOFTBALL_SPORT_ID);
  } catch {
    return [];
  }
}

export function saveQueuedSessions(sessions: PracticeSession[]) {
  writeBrowserStorage(
    QUEUED_SESSIONS_KEY,
    JSON.stringify(sessions.filter((session) => session.sync_state !== "synced")),
  );
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
  sport_id: string;
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
    sport_id: input.sport_id,
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
