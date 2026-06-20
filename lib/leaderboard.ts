import { supabase, ResultRow } from "./supabase";

export interface LeaderEntry {
  client: string;
  name: string;
  games: number;
  wins: number;
  winRate: number;
  bestPrestige: number;
  avgPrestige: number;
}

/** Fetch recent online results and aggregate into a per-player leaderboard. */
export async function fetchLeaderboard(limit = 2000): Promise<LeaderEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  const rows = data as ResultRow[]; // newest first

  const byClient = new Map<string, LeaderEntry & { _sum: number }>();
  for (const r of rows) {
    let e = byClient.get(r.client);
    if (!e) {
      // first occurrence = most recent -> use as display name
      e = { client: r.client, name: r.name, games: 0, wins: 0, winRate: 0, bestPrestige: 0, avgPrestige: 0, _sum: 0 };
      byClient.set(r.client, e);
    }
    e.games++;
    if (r.won) e.wins++;
    e._sum += r.prestige;
    e.bestPrestige = Math.max(e.bestPrestige, r.prestige);
  }

  return [...byClient.values()]
    .map((e) => ({
      client: e.client,
      name: e.name,
      games: e.games,
      wins: e.wins,
      winRate: e.games ? e.wins / e.games : 0,
      bestPrestige: e.bestPrestige,
      avgPrestige: e.games ? e._sum / e.games : 0,
    }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.games - a.games);
}

export function myClientId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("splendor:client");
}
