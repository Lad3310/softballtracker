import type {
  FEELINGS,
  FOCUS_TAGS,
  PRACTICE_TYPES,
  SUMMER_MILESTONE_BADGE_CODES,
} from "@/lib/config";

export type Handedness = "L" | "R" | "switch";
export type SessionStatus = "pending" | "approved" | "rejected";
export type HittingSide = "L" | "R" | "both";
export type FamilyMemberRole = "owner" | "parent";
export type PracticeType = (typeof PRACTICE_TYPES)[number];
export type Feeling = (typeof FEELINGS)[number];
export type FocusTag = (typeof FOCUS_TAGS)[number];
export type SummerMilestoneCode = (typeof SUMMER_MILESTONE_BADGE_CODES)[number];
export type SyncState = "synced" | "syncing" | "queued" | "error";

export interface Family {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyMemberRole;
  created_at: string;
}

export interface Player {
  id: string;
  family_id: string | null;
  name: string;
  display_order: number;
  handedness: Handedness;
  weekly_goal_minutes: number;
  summer_goal_minutes: number;
  summer_start_date: string;
  summer_end_date: string;
  created_at: string;
}

export interface PracticeSessionDrill {
  id: string;
  session_id: string;
  drill_label: string;
  completed: boolean;
  created_at: string;
}

export interface PracticeSession {
  id: string;
  player_id: string;
  practice_type: string;
  minutes: number;
  feeling: string | null;
  focus_tag: string | null;
  notes: string | null;
  status: SessionStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  hitting_side: HittingSide | null;
  session_date: string;
  created_at: string;
  drills: PracticeSessionDrill[];
  sync_state?: SyncState;
}

export interface DrillTemplate {
  id: string;
  family_id: string | null;
  name: string;
  practice_type: string;
  editable: boolean;
  created_at: string;
  items: DrillTemplateItem[];
}

export interface DrillTemplateItem {
  id: string;
  template_id: string;
  label: string;
  sort_order: number;
  created_at: string;
}

export interface Badge {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  created_at: string;
}

export interface PlayerBadge {
  id: string;
  player_id: string;
  badge_id: string;
  earned_at: string;
  week_key: string | null;
  created_at: string;
}

export interface AppSettings {
  id: string;
  family_id: string;
  require_parent_approval: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppData {
  family: Family | null;
  players: Player[];
  sessions: PracticeSession[];
  templates: DrillTemplate[];
  badges: Badge[];
  playerBadges: PlayerBadge[];
  settings: AppSettings;
}

export interface AppDataResult {
  data: AppData;
  mode: "supabase" | "local";
}

export interface LogSessionInput {
  player: Player;
  practice_type: string;
  minutes: number;
  drills: Array<{ label: string; completed: boolean }>;
  feeling?: string | null;
  focus_tag?: string | null;
  notes?: string | null;
  hitting_side?: HittingSide | null;
  session_date?: string;
  require_parent_approval: boolean;
}

export interface SessionPatch {
  practice_type?: string;
  minutes?: number;
  feeling?: string | null;
  focus_tag?: string | null;
  notes?: string | null;
  status?: SessionStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_reason?: string | null;
  hitting_side?: HittingSide | null;
  session_date?: string;
  drills?: Array<{ label: string; completed: boolean }>;
}
