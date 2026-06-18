export const APP_TZ = "America/New_York";

export const WEEK_START_DAY = 1;

export const MINUTE_PRESETS = [5, 10, 15, 20, 30, 45, 60] as const;

export const SUMMER_REWARD_POINTS = 1000;

export const SUMMER_REWARD_END_MONTH_DAY = "08-09";

export const APP_ADMIN_EMAILS = ["joe.laird1@outlook.com"] as const;

export function isAppAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();

  return APP_ADMIN_EMAILS.some((adminEmail) => adminEmail === normalizedEmail);
}

export const FEELINGS = ["Great", "Good", "Hard", "Frustrating"] as const;

export const FOCUS_TAGS = [
  "Ready early",
  "Swing quick",
  "Short to the ball",
  "Quiet feet",
  "Chest on the ball",
  "Hit the middle of the net",
] as const;

export const SUMMER_MILESTONE_BADGE_CODES = [
  "summer_grinder",
  "halfway_there",
  "summer_goal_complete",
] as const;
