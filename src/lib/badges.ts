import { SUMMER_MILESTONE_BADGE_CODES } from "@/lib/config";
import { getSummerMinutes, getMaxStreak } from "@/lib/progress";
import { createId, getWeekKey, nowIso } from "@/lib/time";
import type { Badge, Player, PlayerBadge, PracticeSession } from "@/lib/types";

const PERMANENT_CODES = new Set<string>(SUMMER_MILESTONE_BADGE_CODES);

function badgeKey(badgeId: string, weekKey: string | null) {
  return `${badgeId}:${weekKey ?? "summer"}`;
}

function groupApprovedByWeek(sessions: PracticeSession[], playerId: string) {
  const weeks = new Map<string, PracticeSession[]>();

  for (const session of sessions) {
    if (session.player_id !== playerId || session.status !== "approved") {
      continue;
    }

    const weekKey = getWeekKey(session.session_date);
    weeks.set(weekKey, [...(weeks.get(weekKey) ?? []), session]);
  }

  return weeks;
}

export function recomputePlayerBadges(
  player: Player,
  sessions: PracticeSession[],
  badges: Badge[],
  existingBadges: PlayerBadge[],
) {
  const now = nowIso();
  const badgeByCode = new Map(badges.map((badge) => [badge.code, badge]));
  const existingByKey = new Map(
    existingBadges.map((playerBadge) => [
      badgeKey(playerBadge.badge_id, playerBadge.week_key),
      playerBadge,
    ]),
  );
  const next = new Map<string, PlayerBadge>();

  const addAward = (code: string, weekKey: string | null = null) => {
    const badge = badgeByCode.get(code);

    if (!badge) {
      return;
    }

    const key = badgeKey(badge.id, weekKey);
    const existing = existingByKey.get(key);

    next.set(key, {
      id: existing?.id ?? createId(),
      player_id: player.id,
      badge_id: badge.id,
      earned_at: existing?.earned_at ?? now,
      week_key: weekKey,
      created_at: existing?.created_at ?? now,
    });
  };

  const weeks = groupApprovedByWeek(sessions, player.id);

  for (const [weekKey, weekSessions] of weeks.entries()) {
    const minutes = weekSessions.reduce((sum, session) => sum + session.minutes, 0);
    const teeCount = weekSessions.filter(
      (session) => session.practice_type === "Tee Work",
    ).length;
    const softTossCount = weekSessions.filter(
      (session) => session.practice_type === "Side Soft Toss",
    ).length;

    if (minutes >= 90) {
      addAward("ninety_minute_week", weekKey);
    }

    if (teeCount >= 3) {
      addAward("tee_work_complete", weekKey);
    }

    if (softTossCount >= 3) {
      addAward("soft_toss_complete", weekKey);
    }
  }

  const maxStreak = getMaxStreak(player.id, sessions);

  if (maxStreak >= 3) {
    addAward("three_day_streak");
  }

  if (maxStreak >= 5) {
    addAward("five_day_streak");
  }

  const hasBalancedSession =
    player.handedness === "switch" &&
    sessions.some(
      (session) =>
        session.player_id === player.id &&
        session.status === "approved" &&
        session.hitting_side === "both",
    );

  if (hasBalancedSession) {
    addAward("balanced_hitter");
  }

  const summerMinutes = getSummerMinutes(player, sessions);
  const summerMilestones: Array<[string, number]> = [
    ["summer_grinder", 0.25],
    ["halfway_there", 0.5],
    ["summer_goal_complete", 1],
  ];

  for (const [code, ratio] of summerMilestones) {
    if (summerMinutes >= Math.ceil(player.summer_goal_minutes * ratio)) {
      addAward(code);
    }
  }

  for (const existing of existingBadges) {
    const badge = badges.find((candidate) => candidate.id === existing.badge_id);

    if (badge && PERMANENT_CODES.has(badge.code)) {
      next.set(badgeKey(existing.badge_id, existing.week_key), existing);
    }
  }

  return Array.from(next.values()).sort((a, b) => a.earned_at.localeCompare(b.earned_at));
}

export function getPlayerBadgeDetails(
  playerId: string,
  playerBadges: PlayerBadge[],
  badges: Badge[],
) {
  return playerBadges
    .filter((playerBadge) => playerBadge.player_id === playerId)
    .map((playerBadge) => ({
      playerBadge,
      badge: badges.find((badge) => badge.id === playerBadge.badge_id),
    }))
    .filter((entry): entry is { playerBadge: PlayerBadge; badge: Badge } =>
      Boolean(entry.badge),
    );
}
