import { getWeekKey, getWeeksRemaining, isDateInRange } from "@/lib/time";
import type { Player, PracticeSession } from "@/lib/types";

export function getApprovedSessions(sessions: PracticeSession[], playerId?: string) {
  return sessions.filter(
    (session) =>
      session.status === "approved" && (!playerId || session.player_id === playerId),
  );
}

export function getPendingMinutes(sessions: PracticeSession[], playerId: string) {
  return sessions
    .filter((session) => session.player_id === playerId && session.status === "pending")
    .reduce((sum, session) => sum + session.minutes, 0);
}

export function getRejectedCount(sessions: PracticeSession[], playerId: string) {
  return sessions.filter(
    (session) => session.player_id === playerId && session.status === "rejected",
  ).length;
}

export function getWeeklyMinutes(
  playerId: string,
  sessions: PracticeSession[],
  todayKey: string,
) {
  const weekKey = getWeekKey(todayKey);

  return getApprovedSessions(sessions, playerId)
    .filter((session) => getWeekKey(session.session_date) === weekKey)
    .reduce((sum, session) => sum + session.minutes, 0);
}

export function getSummerMinutes(player: Player, sessions: PracticeSession[]) {
  return getApprovedSessions(sessions, player.id)
    .filter((session) =>
      isDateInRange(session.session_date, player.summer_start_date, player.summer_end_date),
    )
    .reduce((sum, session) => sum + session.minutes, 0);
}

export function getWeeklyProgress(
  player: Player,
  sessions: PracticeSession[],
  todayKey: string,
) {
  const minutes = getWeeklyMinutes(player.id, sessions, todayKey);
  const remaining = Math.max(0, player.weekly_goal_minutes - minutes);
  const percent = Math.min(100, Math.round((minutes / player.weekly_goal_minutes) * 100));

  return { minutes, remaining, percent, met: remaining === 0 };
}

export function getSummerProgress(
  player: Player,
  sessions: PracticeSession[],
  todayKey: string,
) {
  const minutes = getSummerMinutes(player, sessions);
  const remaining = Math.max(0, player.summer_goal_minutes - minutes);
  const percent = Math.min(100, Math.round((minutes / player.summer_goal_minutes) * 100));
  const weeksRemaining = getWeeksRemaining(todayKey, player.summer_end_date);
  const averageNeededPerWeek = Math.ceil(remaining / weeksRemaining);

  return {
    minutes,
    remaining,
    percent,
    weeksRemaining,
    averageNeededPerWeek,
    met: remaining === 0,
    ahead: remaining === 0 || averageNeededPerWeek <= player.weekly_goal_minutes,
  };
}

export function getMaxStreak(playerId: string, sessions: PracticeSession[]) {
  const days = Array.from(
    new Set(getApprovedSessions(sessions, playerId).map((session) => session.session_date)),
  ).sort();

  let best = 0;
  let current = 0;
  let previous: string | null = null;

  for (const day of days) {
    if (!previous) {
      current = 1;
    } else {
      const gap = Math.round(
        (new Date(`${day}T12:00:00Z`).getTime() -
          new Date(`${previous}T12:00:00Z`).getTime()) /
          (24 * 60 * 60 * 1000),
      );
      current = gap === 1 ? current + 1 : 1;
    }

    best = Math.max(best, current);
    previous = day;
  }

  return best;
}
