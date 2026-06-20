import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase env vars are configured (online multiplayer available). */
export const supabaseEnabled = !!(url && key);

// Target the isolated `splendor` schema (separate from other projects).
export const supabase = supabaseEnabled
  ? createClient(url!, key!, { db: { schema: "splendor" } })
  : null;

export interface ChatRow {
  id: number;
  room: string;
  client: string;
  name: string;
  text: string;
  created_at?: string;
}

export interface PresenceRow {
  room: string;
  client: string;
  name: string;
  seat: number | null;
  last_seen: string;
}

export interface ResultRow {
  game_id: string;
  client: string;
  name: string;
  won: boolean;
  prestige: number;
  cards: number;
  nobles: number;
  players: number;
  turns: number;
  created_at?: string;
}

export interface RoomRow {
  code: string;
  config: {
    players: { name: string; isAI: boolean; aiLevel?: string }[];
    seed: number;
    turnSeconds?: number | null;
    aiTakeover?: boolean;
  };
  actions: unknown[];
  seats: Record<string, string>;
  status: "lobby" | "playing" | "finished";
  host: string;
  updated_at?: string;
}
