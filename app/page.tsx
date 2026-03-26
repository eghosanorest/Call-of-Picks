"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Coins,
  Users,
  Package,
  Zap,
  Target,
  ChevronRight,
  Lock,
  Shield,
  Plus,
  CheckCircle2,
  RotateCcw,
  CalendarRange,
  Settings2,
  Save,
  Trash2,
  LogIn,
  Copy,
  LogOut,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import HomeMediaPlayer from "@/components/HomeMediaPlayer";
type MatchResult = "A" | "B" | null;
type PickSide = "A" | "B";
type GroupPredictionType = {
  id: string;
  group_id: string;
  user_id: string;
  match_id: string;
  predicted_score_a: number;
  predicted_score_b: number;
  created_at: string;
  updated_at: string;
};
type MatchType = {
  id: string;
  week: number;
  teamA: string;
  teamB: string;
  startsAt: string;
  startsAtIso: string;
  locked: boolean;
  result: MatchResult;
  scoreA: number | null;
  scoreB: number | null;
  oddA: number | null;
  oddB: number | null;
};
type BetStatus = "open" | "lost" | "won" | "paid";

type BetLegType = {
  id: string;
  bet_id: string;
  match_id: string;
  pick_side: PickSide;
  odd: number;
};

type BetType = {
  id: string;
  user_id: string;
  stake: number;
  total_odds: number;
  potential_payout: number;
  status: BetStatus;
  paid_out: boolean;
  created_at: string;
  legs: BetLegType[];
};
type LocalSymbol = {
  id: string;
  slug: string;
  name: string;
  rarity: "Common" | "Rare" | "Epic" | "Super" | "Legendary" | "Ultra";
  image_path: string | null;
  weight: number;
};
type LocalData = { 
  lastDailyClaim?: string | null;
  currentWeek: number;
  currentMajor: string;
  stageLabel: string;
  sourceLabel: string;
  lastSyncLabel: string;
  weeks: Record<string, Record<number, MatchType[]>>;
  picks: Record<string, PickSide>;
  resolvedMatchIds: string[];
  tokens: number;
  inventory: LocalInventoryItem[];
  spinHistory: { at: number; reels: string[]; won: boolean }[];
  bets: BetType[];
  firelineProgress: number;
  
};
type LocalInventoryItem = {
  inventory_id: string;
  id: string;
  slug: string;
  name: string;
  rarity: "Common" | "Rare" | "Epic" | "Super" | "Legendary" | "Ultra";
  image_path: string | null;
  weight: number;
};

type GroupType = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
};

type MemberType = {
  user_id: string;
  username: string;
  avatar_url?: string;
  showcase_image_url?: string | null;
};

type MemberInventoryItem = {
  inventory_id: string;
  name: string;
  rarity: string;
  image_path: string | null;
  slug?: string | null;
  category?: string | null;
};

type MemberInventory = {
  user_id: string;
  username: string;
  avatar_url?: string;
  items: MemberInventoryItem[];
};

type ChallengeStatus =
  | "pending"
  | "accepted"
  | "second_turn"
  | "finished"
  | "declined"
  | string;

type ChallengeType = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  requested_inventory_item_id: string;
  offered_inventory_item_id: string;
  status: ChallengeStatus;
  winner_user_id?: string | null;
  first_player_id?: string | null;
  second_player_id?: string | null;
  first_player_time?: number | null;
  second_player_time?: number | null;
  first_player_false_start?: boolean | null;
  second_player_false_start?: boolean | null;
  is_draw?: boolean | null;
  created_at: string;
};



type FirstshotRoundState = {
  challengeId: string;
  roundIndex: number;
  signalAt: number | null;
  clicked: boolean;
  times: number[];
  finished: boolean;
};

type FirstshotUiState =
  | "idle"
  | "pending"
  | "ready"
  | "waiting"
  | "live"
  | "saved"
  | "watch"
  | "finished";

const teamIcons: Record<string, string> = {
  "OpTic Texas": "/team-logos/optic-texas-logo.png",
  "FaZe Vegas": "/team-logos/faze-vegas.png",
  "Miami Heretics": "/team-logos/mh-logo.png",
  "Carolina Royal Ravens": "/team-logos/rr-logo.png",
  "Cloud9 New York": "/team-logos/c9-logo.png",
  "Los Angeles Thieves": "/team-logos/lat-logo.png",
  "Riyadh Falcons": "/team-logos/riyadh-falcons.png",
  "G2 Minnesota": "/team-logos/mn-logo.png",
  "Vancouver Surge": "/team-logos/ss-logo.png",
  "Paris Gentle Mates": "/team-logos/gm-logo.png",
  "Toronto Ultra": "/team-logos/koi-logo.png",
  "Boston Breach": "/team-logos/bb-logo.png",
};

const allTeams = Object.keys(teamIcons);

const ADMIN_USER_IDS = [
  "197e055b-e6d1-44aa-8a6c-b715a365f1e1",
];
const majorStructure = [
  {
    id: "major1",
    label: "Major I",
    weeks: [
      { id: 1, label: "W1" },
      { id: 2, label: "W2" },
      { id: 3, label: "W3" },
      { id: 4, label: "W4" },
      { id: 5, label: "W5" },
      { id: 8, label: "Bracket" },
    ],
  },
  {
    id: "major2",
    label: "Major II",
    weeks: [
      { id: 1, label: "W1" },
      { id: 2, label: "W2" },
      { id: 3, label: "W3" },
      { id: 4, label: "W4" },
      { id: 5, label: "W5" },
      { id: 6, label: "W6" },
      { id: 8, label: "Bracket" },
    ],
  },
  {
    id: "major3",
    label: "Major III",
    weeks: [
      { id: 1, label: "W1" },
      { id: 2, label: "W2" },
      { id: 3, label: "W3" },
      { id: 8, label: "Bracket" },
    ],
  },
  {
    id: "major4",
    label: "Major IV",
    weeks: [
      { id: 1, label: "W1" },
      { id: 2, label: "W2" },
      { id: 3, label: "W3" },
      { id: 8, label: "Bracket" },
    ],
  },
  {
    id: "champs",
    label: "Champs",
    weeks: [{ id: 1, label: "Champs" }],
  },
];

const symbolPool: LocalSymbol[] = [
  
  {
    id: "torontoultra-rare",
    slug: "torontoultra-rare",
    name: "Toronto Ultra",
    rarity: "Rare",
    image_path: "/items/torontoultra-rare.png",
    weight: 10,
  },
  {
    id: "mw2gamecover-rare",
    slug: "mw2gamecover-rare",
    name: "MW2 Cover",
    rarity: "Rare",
    image_path: "/items/mw2gamecover-rare.png",
    weight: 10,
  },
  {
    id: "magnum-common",
    slug: "magnum-common",
    name: "Magnum",
    rarity: "Common",
    image_path: "/items/magnum-common.png",
    weight: 25,
  },
  {
    id: "bo3gamecover-legendary",
    slug: "bo3gamecover-legendary",
    name: "BO3 Cover",
    rarity: "Legendary",
    image_path: "/items/bo3gamecover-legendary.png",
    weight: 5,
  },
  {
    id: "goldak-super",
    slug: "goldak-super",
    name: "AK-47 Gold Super",
    rarity: "Legendary",
    image_path: "/items/goldak-super.png",
    weight: 5,
  },
  {
    id: "intervention-fall-epic",
    slug: "intervention-fall-epic",
    name: "Intervention Fall Epic",
    rarity: "Epic",
    image_path: "/items/intervention-fall-epic.png",
    weight: 10,
  },
  {
  id: "champsringlat-epic",
  slug: "champsringlat-epic",
  name: "Champs Ring LAT",
  rarity: "Epic",
  image_path: "/items/champsringlat-epic.png",
  weight: 10,
},
{
    id: "mwfamas-common",
    slug: "mwfamas-common",
    name: "FAMAS MW2 Common",
    rarity: "Rare",
    image_path: "/items/mwfamas-common.png",
    weight: 25,
  },
  {
    id: "m8a7-snake-rare",
    slug: "m8a7-snake-rare",
    name: "M8A7 Snake Rare",
    rarity: "Rare",
    image_path: "/items/m8a7-snake-rare.png",
    weight: 25,
  },
  {
    id: "zombieteddy-ultra",
    slug: "zombieteddy-ultra",
    name: "Zombie Teddy",
    rarity: "Ultra",
    image_path: "/items/zombieteddy-ultra.png",
    weight: 2,
  },
  {
    id: "scrap-rare",
    slug: "scrap-rare",
    name: "Scrap",
    rarity: "Rare",
    image_path: "/items/scrap-rare.png",
    weight: 10,
  },
  {
    id: "prestige9mw2-common",
    slug: "prestige9mw2-common",
    name: "Prestige 9 MW2",
    rarity: "Common",
    image_path: "/items/prestige9mw2-common.png",
    weight: 25,
  },
  {
    id: "scumpii-sign-super",
    slug: "scumpii-sign-super",
    name: "Scumpii Sign Super",
    rarity: "Epic",
    image_path: "/items/scumpii-sign-super.png",
    weight: 10,
  },
  {
    id: "mercules-bpcard97-ultra",
    slug: "mercules-bpcard97-ultra",
    name: "Mercules BPCard97 Ultra",
    rarity: "Legendary",
    image_path: "/items/mercules-bpcard97-ultra.png",
    weight: 5,
  },
];

const rarityStyles: Record<string, string> = {
  Common:
    "bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-700 text-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.03)]",
  Rare:
    "bg-gradient-to-br from-green-950/80 to-zinc-950 border-green-500/40 text-green-200 shadow-[0_0_25px_rgba(34,197,94,0.18)]",
  Epic:
    "bg-gradient-to-br from-blue-950/80 to-zinc-950 border-blue-500/40 text-blue-200 shadow-[0_0_28px_rgba(59,130,246,0.22)]",
  Super:
    "bg-gradient-to-br from-purple-950/80 to-zinc-950 border-purple-500/40 text-purple-200 shadow-[0_0_30px_rgba(168,85,247,0.24)]",
  Legendary:
    "bg-gradient-to-br from-amber-950/80 to-zinc-950 border-amber-500/40 text-amber-200 shadow-[0_0_32px_rgba(245,158,11,0.26)]",
  Ultra:
    "bg-gradient-to-br from-red-800/70 via-red-950 to-zinc-950 border-red-500 text-red-100 shadow-[0_0_45px_rgba(239,68,68,0.5)]",
};

const defaultData: LocalData = {
  currentWeek: 1,
  currentMajor: "major1",
  stageLabel: "Major I Qualifiers",
  sourceLabel: "Supabase",
  lastSyncLabel: "Online",
  weeks: {
    major1: {},
    major2: {},
    major3: {},
    major4: {},
    champs: {},
  },
  picks: {},
  resolvedMatchIds: [],
  tokens: 0,
  inventory: [],
  spinHistory: [],
  bets: [],
  firelineProgress: 0,
};





function isWinningRow(row: LocalSymbol[]) {
  return row.length === 3 && row.every((item) => item.id === row[0].id);
}


function generateInviteCode() {
  return `COP-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

function slugifyItemName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveItemImage(path?: string | null) {
  if (!path || typeof path !== "string") {
    return "/items/fallback.png";
  }

  const cleaned = path.trim();
  if (!cleaned) return "/items/fallback.png";

  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }

  if (cleaned.startsWith("/items/")) {
    return cleaned;
  }

  const { data } = supabase.storage.from("item-images").getPublicUrl(cleaned);
  return data?.publicUrl || "/items/fallback.png";
}

function normalizeRarity(rarity?: string | null) {
  const value = (rarity || "").trim().toLowerCase();

  if (value === "common") return "Common";
  if (value === "rare") return "Rare";
  if (value === "epic") return "Epic";
  if (value === "super") return "Super"; // 🔥 DAS FEHLT
  if (value === "legendary") return "Legendary";
  if (value === "ultra") return "Ultra";

  return "Common";
}


const slugMap: Record<string, string> = {
  "zombieteddy-ultra": "/items/zombieteddy-ultra.png",
  "scrap-rare": "/items/scrap-rare.png",
  "prestige9mw2-common": "/items/prestige9mw2-common.png",
  "torontoultra-rare": "/items/torontoultra-rare.png",
  "mw2gamecover-rare": "/items/mw2gamecover-rare.png",
  "magnum-common": "/items/magnum-common.png",
  "bo3gamecover-legendary": "/items/bo3gamecover-legendary.png",
  "goldak-super": "/items/goldak-super.png",
  "intervention-fall-epic": "/items/intervention-fall-epic.png",
  "mwfamas-common": "/items/mwfamas-common.png",
  "m8a7-snake-rare": "/items/m8a7-snake-rare.png",
  "scumpii-sign-super": "/items/scumpii-sign-super.png",
  "mercules-bpcard97-ultra": "/items/mercules-bpcard97-ultra.png",
  "champsringlat-epic": "/items/champsringlat-epic.png",
};

function getMysteryBoxImagePath(rarity?: string | null) {
  const normalized = normalizeRarity(rarity).toLowerCase();
  return `/items/mysterybox-${normalized}.png`;
}
function getMysteryBoxSlugByRarity(rarity?: string | null) {
  const normalized = normalizeRarity(rarity).toLowerCase();
  return `mysterybox-${normalized}`;
}
function getSafeItemImagePath(
  slug?: string | null,
  imagePath?: string | null
) {
  if (slug && slugMap[slug]) {
    return `${slugMap[slug]}?v=2`;
  }

  if (!imagePath || typeof imagePath !== "string") {
    return "/items/fallback.png";
  }

  const cleaned = imagePath.trim();
  if (!cleaned) {
    return "/items/fallback.png";
  }

  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }

  if (cleaned.startsWith("/items/")) {
    return `${cleaned}?v=2`;
  }

  const { data } = supabase.storage.from("item-images").getPublicUrl(cleaned);
  return data?.publicUrl || "/items/fallback.png";
}




 function getWeightedFirelineBoxRarity(): LocalSymbol["rarity"] {
  
  
  const pool: LocalSymbol["rarity"][] = [
    "Common",
    "Common",
    "Common",
    "Common",
    "Rare",
    "Rare",
    "Rare",
    "Epic",
    "Epic",
    "Super",
  ];

  return pool[Math.floor(Math.random() * pool.length)] || "Common";
} 
function StatCard({
  icon: Icon,
  label,
  value,
  glow,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  glow: string;
  sub?: string;
}) {
  return (
    <div
      className={`rounded-3xl border p-4 shadow-2xl backdrop-blur-xl transition hover:-translate-y-0.5 ${glow}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{label}</span>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
          <Icon className="h-4 w-4 text-zinc-200" />
        </div>
      </div>
      <div className="mt-4 text-3xl font-black tracking-tight">{value}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-500">{sub}</div> : null}
    </div>
  );
}

function Reel({
  symbol,
  spinning,
  delay = 0,
}: {
  symbol: LocalSymbol;
  spinning: boolean;
  delay?: number;
}) {
  const normalized = normalizeRarity(symbol.rarity);
  const rarityClass = rarityStyles[normalized] || rarityStyles.Common;

  return (
    <motion.div
      animate={
        spinning
          ? {
              y: [0, -22, 22, -12, 12, 0],
              scale: [1, 1.05, 1],
              rotateX: [0, -6, 6, -3, 3, 0],
            }
          : { y: 0, scale: 1, rotateX: 0 }
      }
      transition={{ duration: 0.42, repeat: spinning ? 6 : 0, delay }}
      className={`relative flex h-32 w-36 items-center justify-center overflow-hidden rounded-[28px] border p-2 ${rarityClass} md:h-52 md:w-56 xl:h-64 xl:w-64 2xl:h-72 2xl:w-72`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-x-2 top-2 h-7 rounded-full bg-white/12 blur-md" />
      <div className="pointer-events-none absolute inset-x-2 bottom-2 h-6 rounded-full bg-black/40 blur-md" />
      <div className="pointer-events-none absolute inset-y-3 left-0 w-px bg-white/15" />
      <div className="pointer-events-none absolute inset-y-3 right-0 w-px bg-white/15" />
      <div className="absolute inset-0 rounded-[28px] ring-1 ring-white/10" />

      <img
        src={getSafeItemImagePath(symbol.slug, symbol.image_path)}
        alt={symbol.name}
        className="relative z-10 max-h-[90%] max-w-[90%] object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.65)]"
        onError={(e) => {
          e.currentTarget.src = "/items/fallback.png";
        }}
      />
    </motion.div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <div className="text-sm text-zinc-400">{eyebrow}</div>
        <div className="text-2xl font-black">{title}</div>
      </div>
      {right}
    </div>
  );
}

function TeamMini({ name }: { name: string }) {
  const icon = teamIcons[name];
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-sm">
      {icon ? (
        <img src={icon} alt={name} className="h-full w-full object-contain" />
      ) : (
        "🎯"
      )}
    </span>
  );
}

function TeamLabel({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2">
      <TeamMini name={name} />
      <span>{name}</span>
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "primary" | "violet" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const styles =
    variant === "primary"
      ? "bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.12)] hover:scale-[1.02]"
      : variant === "violet"
        ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_10px_30px_rgba(139,92,246,0.35)] hover:scale-[1.02]"
        : variant === "ghost"
          ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
          : "border border-red-500/20 bg-red-500/15 text-red-200 hover:bg-red-500/20";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-4 py-3 font-semibold transition duration-200 disabled:opacity-40 disabled:hover:scale-100 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

function ItemCard({
  item,
  action,
  onClick,
}: {
  item: {
    name: string;
    rarity: string;
    image_path?: string | null;
    slug?: string | null;
    category?: string | null;
    detail_text?: string | null;
    inventory_id?: string;
  };
  action?: React.ReactNode;
  onClick?: () => void;
}) {
  
  const normalizedRarity = normalizeRarity(item.rarity);

  let rarityClass = rarityStyles.Common;
  if (normalizedRarity === "Rare") rarityClass = rarityStyles.Rare;
  if (normalizedRarity === "Epic") rarityClass = rarityStyles.Epic;
  if (normalizedRarity === "Super") rarityClass = rarityStyles.Super;
  if (normalizedRarity === "Legendary") rarityClass = rarityStyles.Legendary;
  if (normalizedRarity === "Ultra") rarityClass = rarityStyles.Ultra;
let innerBg = "bg-black/20";

if (normalizedRarity === "Rare") innerBg = "bg-green-500/10";
if (normalizedRarity === "Epic") innerBg = "bg-blue-500/10";
if (normalizedRarity === "Super") innerBg = "bg-purple-500/10";
if (normalizedRarity === "Legendary") innerBg = "bg-amber-500/10";
if (normalizedRarity === "Ultra") innerBg = "bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.4)]";
  return (
  <div
    onClick={onClick}
    className={`rounded-2xl border p-4 ${rarityClass} ${
      onClick ? "cursor-pointer transition hover:scale-[1.01]" : ""
    }`}
  >
      <div className={`flex h-24 items-center justify-center rounded-2xl p-3 ${innerBg}`}>
        <img
  src={getSafeItemImagePath(item.slug, item.image_path)}
  alt={item.name}
  className="max-h-full max-w-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
  onError={(e) => {
    e.currentTarget.src = "/items/fallback.png";
  }}
/>
      </div>
      <div className="mt-3 font-bold leading-tight">{item.name}</div>
      <div className="text-sm opacity-80">{normalizedRarity}</div>
      {item.category ? (
        <div className="mt-1 text-xs opacity-60">{item.category}</div>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function getMatchStartTime(value?: string | null) {
  if (!value) return NaN;
  return new Date(value).getTime();
}

function hasMatchResult(match: MatchType) {
  return match.result === "A" || match.result === "B";
}

function isMatchLocked(match: MatchType) {
  if (match.locked) return true;

  const startTime = getMatchStartTime(match.startsAtIso);

  if (Number.isNaN(startTime)) {
    console.log("Ungültiges startsAtIso:", match.startsAtIso);
    return false;
  }

  return Date.now() >= startTime;
}

function isMatchClaimable(match: MatchType, resolvedMatchIds: string[]) {
  return (
    isMatchLocked(match) &&
    hasMatchResult(match) &&
    !resolvedMatchIds.includes(String(match.id))
  );
}

function getGridLines(grid: LocalSymbol[][]) {
  return [
    [grid[0][0], grid[0][1], grid[0][2]], // row 1
    [grid[1][0], grid[1][1], grid[1][2]], // row 2
    [grid[2][0], grid[2][1], grid[2][2]], // row 3
    [grid[0][0], grid[1][0], grid[2][0]], // col 1
    [grid[0][1], grid[1][1], grid[2][1]], // col 2
    [grid[0][2], grid[1][2], grid[2][2]], // col 3
    [grid[0][0], grid[1][1], grid[2][2]], // diag
    [grid[0][2], grid[1][1], grid[2][0]], // diag
  ];
}

const MULTILINE_PAYOUTS: Record<number, number> = {
  1: 0.4,
  2: 2,
  3: 10,
  4: 50,
  5: 200,
  6: 1000,
  8: 20000,
};
function getMultiLineMultiplier(hitCount: number) {
  if (hitCount >= 8) return 20000;
  if (hitCount >= 6) return 1000;
  if (hitCount === 5) return 200;
  if (hitCount === 4) return 50;
  if (hitCount === 3) return 10;
  if (hitCount === 2) return 2;
  if (hitCount === 1) return 0.4;
  return 0;
}


  

 



function countWinningLines(grid: LocalSymbol[][]) {
  return getGridLines(grid).filter((line) => isWinningRow(line)).length;
}
function getWinningLineIndexes(grid: LocalSymbol[][]) {
  return getGridLines(grid)
    .map((line, index) => (isWinningRow(line) ? index : -1))
    .filter((index) => index !== -1);
}
function hasSavedScore(match: MatchType) {
  return typeof match.scoreA === "number" && typeof match.scoreB === "number";
}

function getResultFromScore(scoreA: number, scoreB: number): MatchResult {
  if (scoreA === scoreB) return null;
  return scoreA > scoreB ? "A" : "B";
}

function formatOdd(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

function ceilPayout(value: number) {
  return Math.ceil(value);
}
function isValidMatchScore(scoreA: number, scoreB: number) {
  if (
    !Number.isInteger(scoreA) ||
    !Number.isInteger(scoreB) ||
    scoreA < 0 ||
    scoreA > 9 ||
    scoreB < 0 ||
    scoreB > 9
  ) {
    return false;
  }

  if (scoreA === scoreB) return false;

  return true;
}  
const PRESTIGE_CHALLENGES = [
  {
    id: "mwfamas-common-5-super",
    requiredSlug: "mwfamas-common",
    requiredCount: 5,
    rewardRarity: "Super",
    title: "Famas Meister",
  },
  {
    id: "magnum-common-10-legendary",
    requiredSlug: "magnum-common",
    requiredCount: 10,
    rewardRarity: "Legendary",
    title: "Magnum Sammler",
  },
] as const;

const rewardBoxStyles: Record<string, string> = {
  Common: "border-zinc-600 bg-zinc-900 text-zinc-200",
  Rare: "border-green-500/40 bg-green-500/10 text-green-200",
  Epic: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  Super: "border-purple-500/40 bg-purple-500/10 text-purple-200",
  Legendary: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  Ultra: "border-red-500/40 bg-red-500/10 text-red-200",
};

function isMysteryBoxSlug(slug?: string | null) {
  return typeof slug === "string" && slug.startsWith("mysterybox-");
}
function getRarityGlowClasses(rarity?: string | null) {
  const normalized = normalizeRarity(rarity);

  if (normalized === "Rare") {
    return "shadow-[0_0_50px_rgba(34,197,94,0.35)]";
  }
  if (normalized === "Epic") {
    return "shadow-[0_0_55px_rgba(59,130,246,0.35)]";
  }
  if (normalized === "Super") {
    return "shadow-[0_0_60px_rgba(168,85,247,0.42)]";
  }
  if (normalized === "Legendary") {
    return "shadow-[0_0_65px_rgba(245,158,11,0.42)]";
  }
  if (normalized === "Ultra") {
    return "shadow-[0_0_70px_rgba(239,68,68,0.48)]";
  }

  return "shadow-[0_0_40px_rgba(255,255,255,0.18)]";
}
function getRarityFlashClasses(rarity?: string | null) {
  const normalized = normalizeRarity(rarity);

  if (normalized === "Rare") return "bg-green-300/30";
  if (normalized === "Epic") return "bg-blue-300/30";
  if (normalized === "Super") return "bg-purple-300/35";
  if (normalized === "Legendary") return "bg-amber-300/35";
  if (normalized === "Ultra") return "bg-red-300/35";

  return "bg-white/25";
}

function getRarityParticleClasses(rarity?: string | null) {
  const normalized = normalizeRarity(rarity);

  if (normalized === "Rare") return "bg-green-300/70";
  if (normalized === "Epic") return "bg-blue-300/70";
  if (normalized === "Super") return "bg-purple-300/75";
  if (normalized === "Legendary") return "bg-amber-300/75";
  if (normalized === "Ultra") return "bg-red-300/75";

  return "bg-white/70";
}
function MemberShowcaseBox({
  member,
  currentUserId,
  onUpload,
  uploading,
}: {
  member: {
    user_id: string;
    username: string;
    showcase_image_url?: string | null;
  };
  currentUserId: string;
  onUpload: (file: File) => Promise<void> | void;
  uploading: boolean;
}) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const isOwnBox = currentUserId === member.user_id;

  const handlePickImage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isOwnBox || uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file || !isOwnBox) return;

    await onUpload(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handlePickImage}
        disabled={!isOwnBox || uploading}
        title={isOwnBox ? "Bild hochladen" : "Nur eigenes Bild änderbar"}
        className={`flex h-12 w-48 items-center justify-center overflow-hidden rounded-xl border border-white/15 transition ${
          isOwnBox
            ? "bg-white/5 hover:bg-white/10"
            : "cursor-default bg-white/[0.03]"
        } ${uploading ? "opacity-60" : ""}`}
      >
        {member.showcase_image_url ? (
          <img
            src={member.showcase_image_url}
            alt={`${member.username} Showcase`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs text-zinc-400">
            {uploading ? "..." : "Bild"}
          </span>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
function getRarityBorderClasses(rarity?: string | null) {
  const normalized = normalizeRarity(rarity);

  if (normalized === "Rare") return "border-green-400/30";
  if (normalized === "Epic") return "border-blue-400/30";
  if (normalized === "Super") return "border-purple-400/35";
  if (normalized === "Legendary") return "border-amber-400/35";
  if (normalized === "Ultra") return "border-red-400/35";

  return "border-white/15";
}




export default function CallOfPicksPage() {
  

 const [showBetKingModal, setShowBetKingModal] = useState(false);
  const [showGroupPickemModal, setShowGroupPickemModal] = useState(false);
const [showEvaluatedMatchesModal, setShowEvaluatedMatchesModal] = useState(false);

const [groupPredictions, setGroupPredictions] = useState<GroupPredictionType[]>([]);
const [groupPredictionDrafts, setGroupPredictionDrafts] = useState<
  Record<string, { scoreA: string; scoreB: string }>
>({});
const [allItemCatalog, setAllItemCatalog] = useState<
  {
    id: string;
    slug: string;
    name: string;
    rarity: string;
    image_path: string | null;
    category: string | null;
    detail_text?: string | null;
    weight: number | null;
    is_active: boolean | null;
    slot_enabled?: boolean | null;
    multiline_enabled?: boolean | null;
    risk_enabled?: boolean | null;
  }[]
>([]);
const slotSpinLockRef = useRef(false);
  const slotEnabledSymbols = useMemo(() => {
  return allItemCatalog
    .filter((item) => item.slot_enabled !== false)
    .map((item) => ({
      id: item.slug,
      slug: item.slug,
      name: item.name,
      rarity: normalizeRarity(item.rarity) as LocalSymbol["rarity"],
      image_path: item.image_path,
      weight: item.weight ?? 1,
    }));
}, [allItemCatalog]);
const [showcaseUploading, setShowcaseUploading] = useState(false);
const [openingBox, setOpeningBox] = useState<LocalInventoryItem | null>(null);
const [openingReward, setOpeningReward] = useState<LocalInventoryItem | null>(null);
const [openingPhase, setOpeningPhase] = useState<"idle" | "build" | "flash" | "reveal">("idle");
const [openingBusy, setOpeningBusy] = useState(false);
const activeSlotPool = useMemo<LocalSymbol[]>(() => {
  return slotEnabledSymbols.length ? slotEnabledSymbols : symbolPool;
}, [slotEnabledSymbols]);

const weightedRandomFromPool = (list: LocalSymbol[]): LocalSymbol => {
  if (!list.length) return symbolPool[0]!;

  const total = list.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  let roll = Math.random() * total;

  for (const item of list) {
    roll -= item.weight ?? 1;
    if (roll <= 0) return item;
  }

  return list[list.length - 1] ?? symbolPool[0]!;
};


const [inventoryFilter, setInventoryFilter] = useState<
  "all" | "Common" | "Rare" | "Epic" | "Super" | "Legendary" | "Ultra" | "boxes"
>("all");

const [inventorySort, setInventorySort] = useState<
  "rarity-desc" | "rarity-asc" | "latest"
>("rarity-desc");
const getForcedWinSymbol = (): LocalSymbol => {
  return weightedRandomFromPool(activeSlotPool);
};
const buildWinningRow = (symbol?: LocalSymbol): LocalSymbol[] => {
  const winSymbol = symbol || getForcedWinSymbol();
  return [winSymbol, winSymbol, winSymbol];
};

const buildRandomRow = (): LocalSymbol[] => {
  return [
    weightedRandomFromPool(activeSlotPool),
    weightedRandomFromPool(activeSlotPool),
    weightedRandomFromPool(activeSlotPool),
  ];
};
const maybeUpgradeRowToWin = (
  row: LocalSymbol[],
  bonusChance: number
): LocalSymbol[] => {
  if (isWinningRow(row)) return row;

  if (Math.random() < bonusChance) {
    return buildWinningRow();
  }

  return row;
};

const multilineSymbols = useMemo(() => {
  return allItemCatalog
    .filter((item) => item.slot_enabled !== false && item.multiline_enabled === true)
    .map((item) => ({
      id: item.slug,
      slug: item.slug,
      name: item.name,
      rarity: normalizeRarity(item.rarity) as LocalSymbol["rarity"],
      image_path: item.image_path,
      weight: item.weight ?? 1,
    }));
}, [allItemCatalog]);

const buildInitialMultiLineGrid = (pool: LocalSymbol[]): LocalSymbol[][] => {
  if (pool.length >= 3) {
    return [
      [pool[0], pool[1], pool[2]],
      [pool[1], pool[2], pool[0]],
      [pool[2], pool[0], pool[1]],
    ];
  }

  if (pool.length === 2) {
    return [
      [pool[0], pool[1], pool[0]],
      [pool[1], pool[0], pool[1]],
      [pool[0], pool[1], pool[0]],
    ];
  }

  if (pool.length === 1) {
    return [
      [pool[0], pool[0], pool[0]],
      [pool[0], pool[0], pool[0]],
      [pool[0], pool[0], pool[0]],
    ];
  }

  return [
    [symbolPool[0], symbolPool[1], symbolPool[2]],
    [symbolPool[3], symbolPool[4], symbolPool[5]],
    [symbolPool[6], symbolPool[7], symbolPool[8]],
  ];
};

const spinMultiLine = async (): Promise<AutoSpinResult> => {
  if (!userId) {
    setMessage("Bitte zuerst mit Google anmelden.");
    return { success: false, stopAutoSpin: true, stopReason: "Kein Login" };
  }

  if (multilineSymbols.length < 3) {
    setMessage("Für Multi-Line Slots müssen genau 3 Symbole freigegeben sein.");
    return {
      success: false,
      stopAutoSpin: true,
      stopReason: "Multi-Line nicht korrekt konfiguriert",
    };
  }

    if (data.tokens < multiLineStake || spinning) {
    return {
      success: false,
      stopAutoSpin: true,
      stopReason: "Nicht genug Tokens oder Spin läuft bereits.",
    };
  }
multiLineSpinLockRef.current = true;
  setSpinning(true);
  playMultiLineSpinSound();
  setLastMultiLineHitCount(0);
  setLastMultiLinePayout(0);
  setLastMultiLineWinningIndexes([]);

  const nextTokensBeforePayout = data.tokens - multiLineStake;
  const tokenSaved = await updateTokensOnline(nextTokensBeforePayout);

  if (!tokenSaved) {
    stopMultiLineSpinSoundImmediately();
    setSpinning(false);
    return {
      success: false,
      stopAutoSpin: true,
      stopReason: "Tokens konnten nicht aktualisiert werden.",
    };
  }

  updateData((prev) => ({ ...prev, tokens: nextTokensBeforePayout }));

  const randomFromMultiLine = (): LocalSymbol => {
    if (!multilineSymbols.length) return symbolPool[0]!;
    const picked = multilineSymbols[Math.floor(Math.random() * multilineSymbols.length)];
    return picked ?? symbolPool[0]!;
  };

  return new Promise<AutoSpinResult>((resolve) => {
    const rolling = setInterval(() => {
      setMultiLineGrid([
        [randomFromMultiLine(), randomFromMultiLine(), randomFromMultiLine()],
        [randomFromMultiLine(), randomFromMultiLine(), randomFromMultiLine()],
        [randomFromMultiLine(), randomFromMultiLine(), randomFromMultiLine()],
      ]);
    }, 100);

    setTimeout(async () => {
  clearInterval(rolling);
  fadeOutMultiLineSpinSound(500);

  const finalGrid = [
    [randomFromMultiLine(), randomFromMultiLine(), randomFromMultiLine()],
    [randomFromMultiLine(), randomFromMultiLine(), randomFromMultiLine()],
    [randomFromMultiLine(), randomFromMultiLine(), randomFromMultiLine()],
  ];

      const winningIndexes = getWinningLineIndexes(finalGrid);
const hitCount = winningIndexes.length;
const multiplier = getMultiLineMultiplier(hitCount);
const payout = Math.floor(multiLineStake * multiplier);

if (hitCount > 0) {
  playHitSound();

  setTimeout(() => {
    playHitSound3();
  }, 80);
}

setMultiLineGrid(finalGrid);
      const finalTokens = nextTokensBeforePayout + payout;

      if (payout > 0) {
        const { error } = await supabase
          .from("profiles")
          .update({ tokens: finalTokens })
          .eq("id", userId);

        if (error) {
          setMessage(error.message);
          setSpinning(false);
          resolve({
            success: false,
            stopAutoSpin: true,
            stopReason: error.message,
          });
          return;
        }
      }

      setData((prev) => ({ ...prev, tokens: finalTokens }));
      setLastMultiLineHitCount(hitCount);
      setLastMultiLinePayout(payout);
      setLastMultiLineWinningIndexes(winningIndexes);

      setMessage(
        hitCount > 0 ? `${hitCount} Treffer! +${payout} Tokens` : "Kein Treffer."
      );

      multiLineSpinLockRef.current = false;
setSpinning(false);
resolve({ success: true });
    }, 1800);
  });
};

const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<
  "home" | "picks" | "slot" | "profile" | "group" | "admin"
>("home");



useEffect(() => {
  if (screen === "slot") {
    playCasinoBackground();
  } else {
    stopCasinoBackground();
  }

  return () => {
    stopCasinoBackground();
  };
}, [screen]);
  const [data, setData] = useState<LocalData>(defaultData);
const allMatchesFlat = useMemo(() => {
  return Object.values(data.weeks).flatMap((weekMap) =>
    Object.values(weekMap).flat()
  );
}, [data.weeks]);
  const [spinning, setSpinning] = useState(false);
  useEffect(() => {
  return () => {
    stopClassicSpinSound();
    stopMultiLineFade();

    if (multiLineSpinAudioRef.current) {
      multiLineSpinAudioRef.current.pause();
      multiLineSpinAudioRef.current.currentTime = 0;
      multiLineSpinAudioRef.current.volume = 1;
    }
  };
}, []);
  const [lastWin, setLastWin] = useState<LocalSymbol | null>(null);
const [insertImpactKey, setInsertImpactKey] = useState(0);
  const [message, setMessage] = useState("");
  const [, setNowTick] = useState(0);
  const [firelineRewardNotice, setFirelineRewardNotice] = useState("");
const [selectedItemDetail, setSelectedItemDetail] = useState<null | {
  inventory_id?: string;
  id?: string;
  slug?: string | null;
  name: string;
  rarity: string;
  image_path?: string | null;
  detail_text?: string | null;
}>(null);

const [selectedItemHistory, setSelectedItemHistory] = useState<any[]>([]);
const [itemDetailOpen, setItemDetailOpen] = useState(false);
const [expandedInventoryStackSlug, setExpandedInventoryStackSlug] = useState<string | null>(null);

const openItemDetail = async (item: {
  inventory_id?: string;
  slug?: string | null;
  name: string;
  rarity: string;
  image_path?: string | null;
}) => {
  setSelectedItemDetail({
    inventory_id: item.inventory_id,
    slug: item.slug,
    name: item.name,
    rarity: item.rarity,
    image_path: item.image_path,
    detail_text: null,
  });

  setSelectedItemHistory([]);
  setItemDetailOpen(true);

  let detailText: string | null = null;

  if (item.slug) {
    const { data: itemRow } = await supabase
      .from("items")
      .select("detail_text")
      .eq("slug", item.slug)
      .maybeSingle();

    detailText = itemRow?.detail_text || null;
  }

  let historyRows: any[] = [];

  if (item.inventory_id) {
    const { data } = await supabase
      .from("inventory_item_history")
      .select("id, owner_id, action, source_user_id, note, created_at")
      .eq("inventory_item_id", item.inventory_id)
      .order("created_at", { ascending: true });

    historyRows = data || [];
  }

  const userIds = Array.from(
    new Set(
      historyRows.flatMap((row) => [row.owner_id, row.source_user_id]).filter(Boolean)
    )
  );

  let profileMap = new Map<string, string>();

  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", userIds);

    profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, p.display_name || p.username || p.id])
    );
  }

  setSelectedItemDetail({
    inventory_id: item.inventory_id,
    slug: item.slug,
    name: item.name,
    rarity: item.rarity,
    image_path: item.image_path,
    detail_text: detailText,
  });

  setSelectedItemHistory(
    historyRows.map((row) => ({
      ...row,
      owner_name: profileMap.get(row.owner_id) || row.owner_id,
      source_name: row.source_user_id
        ? profileMap.get(row.source_user_id) || row.source_user_id
        : null,
    }))
  );
};

useEffect(() => {
  const interval = setInterval(() => {
    setNowTick(Date.now());
  }, 1000);

  return () => clearInterval(interval);
}, []);


const placeBet = async () => {
  if (!userId) {
    setMessage("Bitte zuerst mit Google anmelden.");
    return;
  }

  if (selectedBetMatches.length < 2) {
  setMessage("Bitte mindestens 2 Matches auswählen.");
  return;
}

  if (selectedBetMatches.length > 20) {
    setMessage("Maximal 20 Tipps pro Wettschein.");
    return;
  }

  if (!Number.isInteger(parsedStake) || parsedStake <= 0) {
    setMessage("Bitte einen gültigen Einsatz eingeben.");
    return;
  }

  if (parsedStake > data.tokens) {
    setMessage("Nicht genug Tokens.");
    return;
  }

  for (const match of selectedBetMatches) {
    const side = betSelections[match.id];
    const odd = side === "A" ? match.oddA : match.oddB;

    if (!odd || odd <= 1) {
      setMessage("Mindestens ein ausgewähltes Match hat keine gültige Quote.");
      return;
    }
  }

  const roundedTotalOdds = Number(totalBetOdds.toFixed(2));
  const payout = ceilPayout(parsedStake * roundedTotalOdds);

  const { data: betRow, error: betError } = await supabase
    .from("bets")
    .insert({
      user_id: userId,
      stake: parsedStake,
      total_odds: roundedTotalOdds,
      potential_payout: payout,
      status: "open",
      paid_out: false,
    })
    .select()
    .single();

  if (betError || !betRow) {
    setMessage(betError?.message || "Wettschein konnte nicht erstellt werden.");
    return;
  }

  const legsPayload = selectedBetMatches.map((match) => {
    const side = betSelections[match.id];
    const odd = side === "A" ? match.oddA : match.oddB;

    return {
      bet_id: betRow.id,
      match_id: match.id,
      pick_side: side,
      odd,
    };
  });

  const { error: legsError } = await supabase.from("bet_legs").insert(legsPayload);

  if (legsError) {
    setMessage(legsError.message);
    return;
  }

  const nextTokens = data.tokens - parsedStake;

  const { error: tokenError } = await supabase
    .from("profiles")
    .update({ tokens: nextTokens })
    .eq("id", userId);

  if (tokenError) {
    setMessage(tokenError.message);
    return;
  }

  setData((prev) => ({ ...prev, tokens: nextTokens }));
  setBetSelections({});
  setBetStake("1");
  setShowBetBuilder(false);
  setMessage("Wette gesetzt.");
  await loadUserBets(userId);
};
  const [userId, setUserId] = useState("");
  useEffect(() => {
  const reloadAfterTabBack = async () => {
    if (document.visibilityState !== "visible") return;
    if (!userId) return;

    await loadMatches();
    await loadUserBets(userId);
    await loadFriends(userId);
    await loadFriendRequests(userId);
    await loadChatList(userId);
  };

  const handleVisibilityChange = () => {
    reloadAfterTabBack();
  };

  const handleWindowFocus = () => {
    reloadAfterTabBack();
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handleWindowFocus);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("focus", handleWindowFocus);
  };
}, [userId]);
  const [userEmail, setUserEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  useEffect(() => {
  if (!userId) return;
  evaluateUserBets(userId);
}, [data.weeks, userId]);
const [profileOpen, setProfileOpen] = useState(false);
const [profileTab, setProfileTab] = useState<"profile" | "friends" | "chat" | "inventory">("profile");
const [chatList, setChatList] = useState<any[]>([]);
const [displayName, setDisplayName] = useState("");
const [avatarUrl, setAvatarUrl] = useState("");
const [friendSearch, setFriendSearch] = useState("");
const [friendSearchResults, setFriendSearchResults] = useState<any[]>([]);
const [friends, setFriends] = useState<any[]>([]);
const [friendRequests, setFriendRequests] = useState<any[]>([]);
const [newItemFile, setNewItemFile] = useState<File | null>(null);
const [newItemName, setNewItemName] = useState("");
const [newItemRarity, setNewItemRarity] = useState<LocalSymbol["rarity"]>("Common");
const [newItemCategory, setNewItemCategory] = useState("");
const [newItemDetailText, setNewItemDetailText] = useState("");
const [uploadingItem, setUploadingItem] = useState(false);
const [chatPosition, setChatPosition] = useState({ x: 24, y: 24 });
const [chatDragging, setChatDragging] = useState(false);
const chatDragOffsetRef = useRef({ x: 0, y: 0 });
const [showPastChallenges, setShowPastChallenges] = useState(false);

const [showItemList, setShowItemList] = useState(false);
const [activeChat, setActiveChat] = useState<any | null>(null);
const [chatMessages, setChatMessages] = useState<any[]>([]);
const [chatInput, setChatInput] = useState("");
const [chatOpen, setChatOpen] = useState(false);
const [chatImageUploading, setChatImageUploading] = useState(false);
const loadChatList = async (uid: string) => {
  if (!uid) {
    setChatList([]);
    return;
  }

  const { data: chats, error: chatsError } = await supabase
    .from("direct_chats")
    .select("id, user_a, user_b")
    .or(`user_a.eq.${uid},user_b.eq.${uid}`);

  if (chatsError) {
    console.error(chatsError);
    setMessage(chatsError.message);
    return;
  }

  if (!chats?.length) {
    setChatList([]);
    return;
  }

  const otherUserIds = chats.map((chat: any) =>
    chat.user_a === uid ? chat.user_b : chat.user_a
  );

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", otherUserIds);

  if (profileError) {
    console.error(profileError);
    setMessage(profileError.message);
    return;
  }

  const profileMap = new Map((profileRows || []).map((p: any) => [p.id, p]));

  setChatList(
    chats.map((chat: any) => {
      const otherUserId = chat.user_a === uid ? chat.user_b : chat.user_a;
      return {
        id: chat.id,
        friend_id: otherUserId,
        profile: profileMap.get(otherUserId) || null,
      };
    })
  );
};
const deleteChatById = async (chatId: string) => {
  if (!userId || !chatId) return;

  const confirmed = window.confirm(
    "Willst du diesen Chat wirklich löschen? Alle Nachrichten in diesem Chat werden entfernt."
  );

  if (!confirmed) return;

  try {
    const { error: deleteMessagesError } = await supabase
      .from("direct_messages")
      .delete()
      .eq("chat_id", chatId);

    if (deleteMessagesError) {
      console.error("DELETE MESSAGES ERROR:", deleteMessagesError);
      setMessage(`Nachrichten konnten nicht gelöscht werden: ${deleteMessagesError.message}`);
      return;
    }

    const { error: deleteChatError } = await supabase
      .from("direct_chats")
      .delete()
      .eq("id", chatId);

    if (deleteChatError) {
      console.error("DELETE CHAT ERROR:", deleteChatError);
      setMessage(`Chat konnte nicht gelöscht werden: ${deleteChatError.message}`);
      return;
    }

    if (activeChat?.id === chatId) {
      setActiveChat(null);
      setChatMessages([]);
      setChatInput("");
      setChatOpen(false);
    }

    await loadChatList(userId);
    setMessage("Chat gelöscht.");
  } catch (error: any) {
    console.error("DELETE CHAT CATCH:", error);
    setMessage(error?.message || "Chat konnte nicht gelöscht werden.");
  }
};
const chatBottomRef = useRef<HTMLDivElement | null>(null);

const startChatDrag = (e: React.MouseEvent<HTMLDivElement>) => {
  setChatDragging(true);
  chatDragOffsetRef.current = {
    x: e.clientX - chatPosition.x,
    y: e.clientY - chatPosition.y,
  };
};

useEffect(() => {
  if (!chatDragging) return;

  const handleMove = (e: MouseEvent) => {
    setChatPosition({
      x: e.clientX - chatDragOffsetRef.current.x,
      y: e.clientY - chatDragOffsetRef.current.y,
    });
  };

  const handleUp = () => {
    setChatDragging(false);
  };

  window.addEventListener("mousemove", handleMove);
  window.addEventListener("mouseup", handleUp);

  return () => {
    window.removeEventListener("mousemove", handleMove);
    window.removeEventListener("mouseup", handleUp);
  };
}, [chatDragging]);

useEffect(() => {
  if (!chatOpen) return;
  chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [chatMessages, chatOpen]);
const uploadAvatar = async (file: File) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !file) return;

  const fileExt = file.name.split(".").pop() || "png";
  const filePath = `${user.id}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error("AVATAR UPLOAD ERROR:", uploadError);
    setMessage(`Upload fehlgeschlagen: ${uploadError.message}`);
    return;
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  setAvatarUrl(publicUrl);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (profileError) {
    console.error(profileError);
    setMessage("Profilbild konnte nicht gespeichert werden.");
    return;
  }

  setMessage("Profilbild aktualisiert.");
};
const uploadShowcaseImage = async (file: File) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !file) return;

  setShowcaseUploading(true);
  setMessage("");

  try {
    const fileExt = file.name.split(".").pop() || "png";
    const filePath = `${user.id}/showcase-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage(`Showcase-Upload fehlgeschlagen: ${uploadError.message}`);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ showcase_image_url: publicUrl })
      .eq("id", user.id);

    if (profileError) {
      setMessage(`Showcase konnte nicht gespeichert werden: ${profileError.message}`);
      return;
    }

    setMessage("Showcase-Bild gespeichert.");

    if (activeGroupId) {
      await loadGroupDetails(activeGroupId);
    }
  } finally {
    setShowcaseUploading(false);
  }
};
const saveProfile = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const name = displayName.trim();

  if (!name) {
    setMessage("Bitte einen Anzeigenamen eingeben.");
    return;
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    username: name,
    display_name: name,
    avatar_url: avatarUrl,
  });

  if (error) {
    console.error(error);
    setMessage("Profil konnte nicht gespeichert werden.");
    return;
  }

  setProfileName(name);
  setNeedsUsername(false);
  setMessage("Profil gespeichert.");

  await loadFriends(user.id);
  await loadFriendRequests(user.id);
};
const searchUsers = async () => {
  if (!friendSearch.trim()) {
    setFriendSearchResults([]);
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .ilike("username", `%${friendSearch.trim()}%`)
    .limit(10);

  if (error) {
    console.error(error);
    setMessage(error.message);
    return;
  }

  setFriendSearchResults((data || []).filter((row: any) => row.id !== userId));
};

const sendFriendRequest = async (receiverId: string) => {
  if (!userId) return;

  const { error } = await supabase.from("friend_requests").insert({
    sender_id: userId,
    receiver_id: receiverId,
    status: "pending",
  });

  if (error) {
    console.error(error);
    setMessage(error.message);
    return;
  }

  setMessage("Freundschaftsanfrage gesendet.");
  await loadFriendRequests(userId);
};

const loadFriendRequests = async (uid: string) => {
  const { data, error } = await supabase
    .from("friend_requests")
    .select(`
      id,
      sender_id,
      receiver_id,
      status
    `)
    .eq("receiver_id", uid)
    .eq("status", "pending");

  if (error) {
    console.error(error);
    setMessage(error.message);
    return;
  }

  if (!data?.length) {
    setFriendRequests([]);
    return;
  }

  const senderIds = data.map((row: any) => row.sender_id);

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", senderIds);

  if (profileError) {
    console.error(profileError);
    setMessage(profileError.message);
    return;
  }

  const profileMap = new Map((profileRows || []).map((p: any) => [p.id, p]));

  setFriendRequests(
    data.map((row: any) => ({
      ...row,
      sender_profile: profileMap.get(row.sender_id) || null,
    }))
  );
};

const acceptFriendRequest = async (request: any) => {
  const { error: reqError } = await supabase
    .from("friend_requests")
    .update({ status: "accepted" })
    .eq("id", request.id);

  if (reqError) {
    console.error(reqError);
    setMessage(reqError.message);
    return;
  }

  const { error: friendsError } = await supabase.from("friends").insert([
    { user_id: request.sender_id, friend_id: request.receiver_id },
    { user_id: request.receiver_id, friend_id: request.sender_id },
  ]);

  if (friendsError) {
    console.error(friendsError);
    setMessage(friendsError.message);
    return;
  }

  setMessage("Freund hinzugefügt.");
  await loadFriends(userId);
  await loadFriendRequests(userId);
};
const saveGroupPrediction = async (match: MatchType) => {
  if (!userId || !activeGroupId) {
    setMessage("Keine aktive Gruppe oder kein Login.");
    return;
  }

  if (isMatchLocked(match)) {
    setMessage("Dieses Match ist bereits gesperrt.");
    return;
  }

  const draft = groupPredictionDrafts[match.id];
  const scoreA = Number(draft?.scoreA ?? "");
  const scoreB = Number(draft?.scoreB ?? "");

  if (
    Number.isNaN(scoreA) ||
    Number.isNaN(scoreB) ||
    scoreA < 0 ||
    scoreB < 0
  ) {
    setMessage("Bitte ein gültiges Ergebnis eintragen.");
    return;
  }

  const { error } = await supabase
    .from("group_match_predictions")
    .upsert(
      {
        group_id: activeGroupId,
        user_id: userId,
        match_id: match.id,
        predicted_score_a: scoreA,
        predicted_score_b: scoreB,
      },
      {
        onConflict: "group_id,user_id,match_id",
      }
    );

  if (error) {
    setMessage(error.message);
    return;
  }

  setMessage("Pick'em Tipp gespeichert.");
  await loadGroupPredictions(activeGroupId);
};
const loadGroupPredictions = async (groupId: string) => {
  if (!groupId) {
    setGroupPredictions([]);
    return;
  }

  const { data: rows, error } = await supabase
    .from("group_match_predictions")
    .select("*")
    .eq("group_id", groupId);

  if (error) {
    setMessage(error.message);
    return;
  }

  setGroupPredictions((rows || []) as GroupPredictionType[]);
};
const loadFriends = async (uid: string) => {
  const { data, error } = await supabase
    .from("friends")
    .select("id, user_id, friend_id")
    .eq("user_id", uid);

  if (error) {
    console.error(error);
    setMessage(error.message);
    return;
  }

  if (!data?.length) {
    setFriends([]);
    return;
  }

  const friendIds = data.map((row: any) => row.friend_id);

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", friendIds);

  if (profileError) {
    console.error(profileError);
    setMessage(profileError.message);
    return;
  }

  const profileMap = new Map((profileRows || []).map((p: any) => [p.id, p]));

  setFriends(
    data.map((row: any) => ({
      ...row,
      profile: profileMap.get(row.friend_id) || null,
    }))
  );
};

const loadMessages = async (chatId: string) => {
  const { data, error } = await supabase
    .from("direct_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("LOAD MESSAGES ERROR:", error);
    setMessage(error.message);
    return;
  }

  setChatMessages(data || []);
};

const openChatWithFriend = async (friendId: string) => {
  if (!userId) return;

  let { data: existing, error: existingError } = await supabase
    .from("direct_chats")
    .select("*")
    .or(
      `and(user_a.eq.${userId},user_b.eq.${friendId}),and(user_a.eq.${friendId},user_b.eq.${userId})`
    )
    .maybeSingle();

  if (existingError) {
    console.error(existingError);
    setMessage(existingError.message);
    return;
  }

  let chat = existing;

  if (!chat) {
    const { data: created, error: createError } = await supabase
      .from("direct_chats")
      .insert({
        user_a: userId,
        user_b: friendId,
      })
      .select()
      .single();

    if (createError) {
      console.error(createError);
      setMessage(createError.message);
      return;
    }

    chat = created;
  }

  setActiveChat(chat);
  setChatOpen(true);
  await loadMessages(chat.id);
};

const sendMessage = async () => {
  if (!userId || !activeChat || !chatInput.trim()) return;

  const messageToSend = chatInput.trim();

  const optimisticMessage = {
    id: `local-${Date.now()}`,
    chat_id: activeChat.id,
    sender_id: userId,
    message: messageToSend,
    created_at: new Date().toISOString(),
  };

  setChatMessages((prev) => [...prev, optimisticMessage]);
  setChatInput("");

  const { error } = await supabase.from("direct_messages").insert({
    chat_id: activeChat.id,
    sender_id: userId,
    message: messageToSend,
  });

  if (error) {
    console.error(error);
    setMessage(error.message);
    setChatMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
    setChatInput(messageToSend);
    return;
  }

  await loadMessages(activeChat.id);
};



const sendChatImage = async (file: File) => {
  if (!userId || !activeChat || !file) return;

  try {
    setChatImageUploading(true);

    const ext = file.name.split(".").pop() || "png";
    const filePath = `${activeChat.id}/${userId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-images")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      console.error(uploadError);
      setMessage(uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("chat-images")
      .getPublicUrl(filePath);

    const imageUrl = data.publicUrl;

    const { error } = await supabase.from("direct_messages").insert({
      chat_id: activeChat.id,
      sender_id: userId,
      message: "",
      image_url: imageUrl,
    });

    if (error) {
      console.error(error);
      setMessage(error.message);
      return;
    }

    await loadMessages(activeChat.id);
  } finally {
    setChatImageUploading(false);
  }
};

const [showCompletedHomeMatches, setShowCompletedHomeMatches] = useState(false);
  const [myGroups, setMyGroups] = useState<GroupType[]>([]);
  const [activeGroupId, setActiveGroupId] = useState("");
  const [members, setMembers] = useState<MemberType[]>([]);
  const [memberInventories, setMemberInventories] = useState<MemberInventory[]>([]);
const [showBetBuilder, setShowBetBuilder] = useState(false);
const [showMyBets, setShowMyBets] = useState(false);
const [betStake, setBetStake] = useState("1");
const [betSelections, setBetSelections] = useState<Record<string, PickSide>>({});
  
const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
const allOpenMatches = useMemo(() => {
  return Object.values(data.weeks)
    .flatMap((weekMap) => Object.values(weekMap).flat())
    .filter((match) => !hasSavedScore(match) && !isMatchLocked(match));
}, [data.weeks]);
const toggleBetSelection = (matchId: string, side: PickSide) => {
  setBetSelections((prev) => {
    const current = prev[matchId];
    if (current === side) {
      const next = { ...prev };
      delete next[matchId];
      return next;
    }
    return { ...prev, [matchId]: side };
  });
};
const selectedBetMatches = allOpenMatches.filter((match) => betSelections[match.id]);
const evaluateUserBets = async (uid: string) => {
  const { data: betRows, error: betError } = await supabase
    .from("bets")
    .select("*")
    .eq("user_id", uid)
    .eq("status", "open");

  if (betError || !betRows?.length) return;

  const betIds = betRows.map((b: any) => b.id);

  const { data: legRows, error: legError } = await supabase
    .from("bet_legs")
    .select("*")
    .in("bet_id", betIds);

  if (legError || !legRows) return;

  const allMatches = Object.values(data.weeks).flatMap((weekMap) =>
    Object.values(weekMap).flat()
  );
  const matchMap = new Map(allMatches.map((m) => [m.id, m]));

  for (const bet of betRows) {
    const legs = legRows.filter((leg: any) => leg.bet_id === bet.id);

    let lost = false;
    let allResolved = true;

    for (const leg of legs) {
      const match = matchMap.get(String(leg.match_id));

      if (!match || !hasSavedScore(match) || !match.result) {
        allResolved = false;
        continue;
      }

      if (match.result !== leg.pick_side) {
        lost = true;
        break;
      }
    }

    if (lost) {
      await supabase.from("bets").update({ status: "lost" }).eq("id", bet.id);
    } else if (allResolved) {
      await supabase.from("bets").update({ status: "won" }).eq("id", bet.id);
    }
  }

  await loadUserBets(uid);
};
const totalBetOdds = selectedBetMatches.reduce((acc, match) => {
  const side = betSelections[match.id];
  const odd = side === "A" ? match.oddA : match.oddB;
  return acc * (odd || 1);
}, 1);
const SLOT_STAKES = [1, 5, 10, 20, 50, 100] as const;

const SLOT_BONUS_CHANCE: Record<number, number> = {
  1: 0,
  5: 0.025,
  10: 0.05,
  20: 0.1,
  50: 0.25,
  100: 0.5,
};
const [firelineFlash, setFirelineFlash] = useState(false);
const multiLineSpinAudioRef = useRef<HTMLAudioElement | null>(null);
const multiLineSpinFadeRef = useRef<number | null>(null);
const multiLineSpinLockRef = useRef(false);
const stopMultiLineFade = () => {
  if (multiLineSpinFadeRef.current) {
    window.clearInterval(multiLineSpinFadeRef.current);
    multiLineSpinFadeRef.current = null;
  }
};

const ensureMultiLineSpinAudio = () => {
  if (!multiLineSpinAudioRef.current) {
    multiLineSpinAudioRef.current = new Audio("/sounds/spinsound4.mp3");
    multiLineSpinAudioRef.current.preload = "auto";
    multiLineSpinAudioRef.current.loop = true;
    multiLineSpinAudioRef.current.volume = 1;
  }

  return multiLineSpinAudioRef.current;
};

const playMultiLineSpinSound = () => {
  try {
    const audio = ensureMultiLineSpinAudio();

    // laufenden Fade sofort abbrechen
    stopMultiLineFade();

    audio.loop = true;
    audio.volume = 1;

    // wenn gerade noch ein alter Fade pausiert/stoppt, hart resetten
    if (!audio.paused && audio.ended === false) {
      // läuft schon -> einfach volle Lautstärke sicherstellen
      audio.volume = 1;
      return;
    }

    audio.pause();
    audio.currentTime = 0;

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((err) => {
        console.error("spinsound4 play error:", err);
      });
    }
  } catch (err) {
    console.error("spinsound4 setup error:", err);
  }
};

const fadeOutMultiLineSpinSound = (duration = 500) => {
  try {
    const audio = multiLineSpinAudioRef.current;
    if (!audio) return;

    stopMultiLineFade();

    if (audio.paused) {
      audio.volume = 1;
      return;
    }

    const startVolume = audio.volume;
    const steps = 10;
    const stepDuration = Math.max(20, Math.floor(duration / steps));
    let step = 0;

    multiLineSpinFadeRef.current = window.setInterval(() => {
      // falls in der Zwischenzeit ein neuer Spin gestartet wurde
      if (audio.paused === false && audio.volume === 1 && step > 0) {
        stopMultiLineFade();
        return;
      }

      step += 1;
      const nextVolume = Math.max(0, startVolume * (1 - step / steps));
      audio.volume = nextVolume;

      if (step >= steps) {
        stopMultiLineFade();
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
      }
    }, stepDuration);
  } catch {}
};

const stopMultiLineSpinSoundImmediately = () => {
  const audio = multiLineSpinAudioRef.current;
  if (!audio) return;

  stopMultiLineFade();
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 1;
};
const hitSoundRef = useRef<HTMLAudioElement | null>(null);
const alienAudioRef = useRef<HTMLAudioElement | null>(null);

const playAlienSound = () => {
  try {
    if (!alienAudioRef.current) {
      alienAudioRef.current = new Audio("/sounds/alien1.mp3");
      alienAudioRef.current.preload = "auto";
    }

    const audio = alienAudioRef.current;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
    audio.play().catch(() => {});
  } catch {}
};

const classicSpinAudioRef = useRef<HTMLAudioElement | null>(null);
const classicSpinSoundIdRef = useRef(0);
  const mysteryLoadupAudioRef = useRef<HTMLAudioElement | null>(null);
  const mysteryWaterbombAudioRef = useRef<HTMLAudioElement | null>(null);
  const mysteryInsertAudioRef = useRef<HTMLAudioElement | null>(null);
const casinoBackgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const mysteryAudioFadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mysteryInsertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const hitSound2Ref = useRef<HTMLAudioElement | null>(null);

const stopMysteryAudioFade = () => {
  if (mysteryAudioFadeRef.current) {
    clearInterval(mysteryAudioFadeRef.current);
    mysteryAudioFadeRef.current = null;
  }
};

const stopMysteryInsertTimeout = () => {
  if (mysteryInsertTimeoutRef.current) {
    clearTimeout(mysteryInsertTimeoutRef.current);
    mysteryInsertTimeoutRef.current = null;
  }
};

const stopAndResetAudio = (audio: HTMLAudioElement | null) => {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
};

const ensureMysteryAudio = () => {
  if (!mysteryLoadupAudioRef.current) {
    mysteryLoadupAudioRef.current = new Audio("/sounds/loadup.mp3");
    mysteryLoadupAudioRef.current.preload = "auto";
  }

  if (!mysteryWaterbombAudioRef.current) {
    mysteryWaterbombAudioRef.current = new Audio("/sounds/wasserbomb.mp3");
    mysteryWaterbombAudioRef.current.preload = "auto";
  }

  if (!mysteryInsertAudioRef.current) {
    mysteryInsertAudioRef.current = new Audio("/sounds/insertsound.mp3");
    mysteryInsertAudioRef.current.preload = "auto";
  }
};
const impactSoundRef = useRef<HTMLAudioElement | null>(null);
const playHitSound = () => {
  try {
    if (!hitSoundRef.current) {
      hitSoundRef.current = new Audio("/sounds/hitsound1.mp3");
      hitSoundRef.current.preload = "auto";
    }

    const audio = hitSoundRef.current;

    audio.currentTime = 0; // 🔥 wichtig → immer neu starten
    audio.volume = 1;    // kannst du anpassen
    audio.play().catch(() => {});
  } catch {}
};
const playHitSound2 = () => {
  try {
    if (!hitSound2Ref.current) {
      hitSound2Ref.current = new Audio("/sounds/hitsound2.mp3");
      hitSound2Ref.current.preload = "auto";
    }

    const audio = hitSound2Ref.current;
    audio.currentTime = 0;
    audio.volume = 1; // 🔥 darf knallen
    audio.play().catch(() => {});
  } catch {}
};
const hitSound3Ref = useRef<HTMLAudioElement | null>(null);

const playHitSound3 = () => {
  try {
    if (!hitSound3Ref.current) {
      const audio = new Audio("/sounds/hitsound3.mp3");
      audio.preload = "auto";
      audio.volume = 1;

      // 🔥 BOOST (wichtig)
      audio.playbackRate = 1; // optional leicht höher machen für mehr Punch

      hitSound3Ref.current = audio;
    }

    const audio = hitSound3Ref.current;

    audio.pause();
    audio.currentTime = 0;

    // 🔥 jedes Mal volle Lautstärke erzwingen
    audio.volume = 1;

    audio.play().catch((err) => {
      console.error("hitsound3 error:", err);
    });
  } catch (err) {
    console.error("hitsound3 setup error:", err);
  }
};
const playImpactSound = () => {
  try {
    if (!impactSoundRef.current) {
      impactSoundRef.current = new Audio("/sounds/impactsound.mp3");
      impactSoundRef.current.preload = "auto";
    }

    const audio = impactSoundRef.current;

    audio.currentTime = 0;
    audio.volume = 0.8; // 🔥 schön knackig
    audio.play().catch(() => {});
  } catch {}
};
const playCasinoBackground = () => {
  try {
    if (!casinoBackgroundAudioRef.current) {
      const audio = new Audio("/sounds/casinobackground.mp3");
      audio.loop = true;
      audio.volume = 0.12; // schön dezent
      casinoBackgroundAudioRef.current = audio;
    }

    const audio = casinoBackgroundAudioRef.current;

    // 🔥 verhindert mehrfaches Starten
    if (audio.paused) {
      audio.play().catch(() => {});
    }
  } catch {}
};
const fadeOutAudio = (
  audio: HTMLAudioElement | null,
  duration = 400
) => {
  if (!audio) return;

  const startVolume = audio.volume;
  const steps = 12;
  const stepTime = duration / steps;
  let currentStep = 0;

  const fade = setInterval(() => {
    currentStep++;

    const nextVolume = startVolume * (1 - currentStep / steps);
    audio.volume = Math.max(0, nextVolume);

    if (currentStep >= steps) {
      clearInterval(fade);
      audio.pause();
      audio.currentTime = 0;
      audio.volume = startVolume;
    }
  }, stepTime);
};
const lastFirelineRef = useRef(0);

useEffect(() => {
  const current = data.firelineProgress;
  const previous = lastFirelineRef.current;

  if (current > previous) {
    if (current >= 1 && current <= 4) {
      playImpactSound();
    }

    if (current >= 5) {
      playImpactSound();
      setFirelineFlash(true);

      setTimeout(() => {
        playHitSound2();
      }, 120);

      setTimeout(() => {
        setFirelineFlash(false);
      }, 450);
    }
  }

  lastFirelineRef.current = current;
}, [data.firelineProgress]);
const stopClassicSpinSound = (soundIdAtSpinStart?: number) => {
  
  
  
  const audio = classicSpinAudioRef.current;
  if (!audio) return;

  if (
    typeof soundIdAtSpinStart === "number" &&
    soundIdAtSpinStart !== classicSpinSoundIdRef.current
  ) {
    return;
  }

  fadeOutAudio(audio, 500);
};
const stopCasinoBackground = () => {
  const audio = casinoBackgroundAudioRef.current;
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
};
const playMysteryLoadupSound = () => {
  try {
    ensureMysteryAudio();
    stopMysteryAudioFade();
    stopMysteryInsertTimeout();

    const loadup = mysteryLoadupAudioRef.current;
    const waterbomb = mysteryWaterbombAudioRef.current;
    const insert = mysteryInsertAudioRef.current;

    stopAndResetAudio(waterbomb);
    stopAndResetAudio(insert);

    if (!loadup) return;

    loadup.pause();
    loadup.currentTime = 0;
    loadup.volume = 1;
    loadup.play().catch(() => {});
  } catch {}
};

const playMysteryRevealSounds = () => {
  try {
    ensureMysteryAudio();
    stopMysteryAudioFade();
    stopMysteryInsertTimeout();

    const loadup = mysteryLoadupAudioRef.current;
    const waterbomb = mysteryWaterbombAudioRef.current;
    const insert = mysteryInsertAudioRef.current;
const fadeOutAudio = (
  audio: HTMLAudioElement | null,
  duration = 280
) => {
  if (!audio) return;

  const startVolume = audio.volume;
  const steps = 10;
  const stepTime = duration / steps;
  let currentStep = 0;

  const fade = setInterval(() => {
    currentStep++;

    const nextVolume =
      startVolume * (1 - currentStep / steps);

    audio.volume = Math.max(0, nextVolume);

    if (currentStep >= steps) {
      clearInterval(fade);
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1; // reset für nächstes Mal
    }
  }, stepTime);
};
    fadeOutAudio(loadup, 280);

    if (waterbomb) {
      waterbomb.pause();
      waterbomb.currentTime = 0;
      waterbomb.volume = 1;
      waterbomb.play().catch(() => {});
    }

    mysteryInsertTimeoutRef.current = setTimeout(() => {
      if (insert) {
  insert.pause();
  insert.currentTime = 0;
  insert.volume = 1;
  insert.play().catch(() => {});

  setInsertImpactKey((prev) => prev + 1);
}

      if (waterbomb) {
        const fadeStep = 0.12;
        const fadeInterval = 40;

        mysteryAudioFadeRef.current = setInterval(() => {
          if (!waterbomb) return;

          waterbomb.volume = Math.max(0, waterbomb.volume - fadeStep);

          if (waterbomb.volume <= 0.02) {
            stopMysteryAudioFade();
            stopAndResetAudio(waterbomb);
            waterbomb.volume = 1;
          }
        }, fadeInterval);
      }
    }, 1550);
  } catch {}
};

const stopMysteryBoxSounds = () => {
  stopMysteryAudioFade();
  stopMysteryInsertTimeout();

  stopAndResetAudio(mysteryLoadupAudioRef.current);
  stopAndResetAudio(mysteryWaterbombAudioRef.current);
  stopAndResetAudio(mysteryInsertAudioRef.current);

  if (mysteryWaterbombAudioRef.current) {
    mysteryWaterbombAudioRef.current.volume = 1;
  }
};



const playClassicSpinSound = () => {
  try {
    classicSpinSoundIdRef.current += 1;

    if (classicSpinAudioRef.current) {
      classicSpinAudioRef.current.pause();
      classicSpinAudioRef.current.currentTime = 0;
    }

    const audio = new Audio("/sounds/spinsound2.mp3");
    audio.preload = "auto";
    audio.volume = 1;

    classicSpinAudioRef.current = audio;

    audio.play().catch(() => {});
  } catch {}
};



const parsedStake = Number(betStake) || 0;
const potentialBetWin =
  parsedStake > 0 && selectedBetMatches.length > 0
    ? ceilPayout(parsedStake * totalBetOdds)
    : 0;

const [slotStake, setSlotStake] = useState<number>(1);
const [multiSlotMode, setMultiSlotMode] = useState(false);
const [multiLineStake, setMultiLineStake] = useState<number>(1);
const [slotViewMode, setSlotViewMode] = useState<"classic" | "multiline" | "risk">("classic");

const effectiveSlotCost = multiSlotMode ? slotStake * 3 : slotStake;

const [autoSpinCount, setAutoSpinCount] = useState<number>(10);
const [autoSpinRemaining, setAutoSpinRemaining] = useState<number>(0);
const [autoSpinRunning, setAutoSpinRunning] = useState(false);
const [autoSpinMode, setAutoSpinMode] = useState<"slot" | "multiline-slot" | "risk" | null>(null);
const autoSpinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const rarityRank: Record<string, number> = {
  Common: 1,
  Rare: 2,
  Epic: 3,
  Super: 4,
  Legendary: 5,
  Ultra: 6,
};
type AutoSpinResult = {
  success: boolean;
  stopAutoSpin?: boolean;
  stopReason?: string;
};
const isSuperOrHigher = (rarity?: string | null) => {
  if (!rarity) return false;
  return (rarityRank[rarity] || 0) >= rarityRank["Super"];
};

const stopAutoSpin = () => {
  setAutoSpinRunning(false);
  setAutoSpinMode(null);
  setAutoSpinRemaining(0);

  if (autoSpinTimeoutRef.current) {
    clearTimeout(autoSpinTimeoutRef.current);
    autoSpinTimeoutRef.current = null;
  }
};

const startAutoSpin = (mode: "slot" | "multiline-slot" | "risk") => {
  const capped = Math.max(1, Math.min(100, Number(autoSpinCount) || 1));
  setAutoSpinRunning(true);
  setAutoSpinMode(mode);
  setAutoSpinRemaining(capped);
};

const [reels, setReels] = useState<LocalSymbol[]>([
  symbolPool[0],
  symbolPool[1],
  symbolPool[2],
]);

const [multiReels, setMultiReels] = useState<LocalSymbol[][]>([
  [symbolPool[0], symbolPool[1], symbolPool[2]],
  [symbolPool[3], symbolPool[4], symbolPool[5]],
  [symbolPool[6], symbolPool[7], symbolPool[8]],
]);

const [multiLineGrid, setMultiLineGrid] = useState<LocalSymbol[][]>([]);

useEffect(() => {
  if (multilineSymbols.length > 0) {
    setMultiLineGrid(buildInitialMultiLineGrid(multilineSymbols));
  }
}, [multilineSymbols]);

const [lastWins, setLastWins] = useState<LocalSymbol[]>([]);
const [lastMultiLineHitCount, setLastMultiLineHitCount] = useState(0);
const [lastMultiLinePayout, setLastMultiLinePayout] = useState(0);
const [lastMultiLineWinningIndexes, setLastMultiLineWinningIndexes] = useState<number[]>([]);

// Alles Spitze
const RISK_VISIBLE_COUNT = 41;
const RISK_ITEM_WIDTH = 104;
const RISK_ITEM_GAP = 20;
const RISK_STEP = RISK_ITEM_WIDTH + RISK_ITEM_GAP;
const RISK_BUFFER_LEFT = 18;
const RISK_SESSION_LENGTH = 240;
const RISK_START_INDEX = 18;
const RISK_BUST_CHANCE = 0.28;

const riskEnabledSymbols = useMemo(() => {
  return allItemCatalog
    .filter((item) => item.risk_enabled !== false)
    .map((item) => ({
      id: item.slug,
      slug: item.slug,
      name: item.name,
      rarity: normalizeRarity(item.rarity) as LocalSymbol["rarity"],
      image_path: item.image_path,
      weight: item.weight ?? 1,
    }));
}, [allItemCatalog]);

const riskAllSymbols = useMemo<LocalSymbol[]>(() => {
  return riskEnabledSymbols.length ? riskEnabledSymbols : symbolPool;
}, [riskEnabledSymbols]);

const riskSafePool = useMemo<LocalSymbol[]>(() => {
  return riskAllSymbols.filter((item) => item.slug !== "zombieteddy-ultra");
}, [riskAllSymbols]);

const zombieTeddySymbol = useMemo<LocalSymbol>(() => {
  return (
    riskAllSymbols.find((item) => item.slug === "zombieteddy-ultra") ||
    symbolPool.find((item) => item.slug === "zombieteddy-ultra") ||
    symbolPool[0]!
  );
}, [riskAllSymbols]);

const buildRiskStrip = (count = RISK_VISIBLE_COUNT): LocalSymbol[] => {
  const source = riskAllSymbols.length ? riskAllSymbols : symbolPool;
  return Array.from({ length: count }, () => {
    const picked = source[Math.floor(Math.random() * source.length)];
    return picked ?? symbolPool[0]!;
  });
};

const ensureRiskGameStripLength = (
  strip: LocalSymbol[],
  minLength: number
): LocalSymbol[] => {
  if (strip.length >= minLength) return strip;

  const source = riskAllSymbols.length ? riskAllSymbols : symbolPool;
  const extra = Array.from({ length: minLength - strip.length }, () => {
    const picked = source[Math.floor(Math.random() * source.length)];
    return picked ?? symbolPool[0]!;
  });

  return [...strip, ...extra];
};

const [riskSelectedIndex, setRiskSelectedIndex] = useState<number | null>(null);
const riskStake = slotStake;
const [riskPot, setRiskPot] = useState(0);
const [riskStreak, setRiskStreak] = useState(0);
const [riskRunning, setRiskRunning] = useState(false);

useEffect(() => {
  if (!autoSpinRunning || !autoSpinMode) return;

  if (autoSpinRemaining <= 0) {
    stopAutoSpin();
    return;
  }

  if (spinning || riskRunning || openingBusy) return;

  autoSpinTimeoutRef.current = setTimeout(async () => {
    let result: AutoSpinResult = { success: false };

    if (autoSpinMode === "slot") {
      result = await spin();
    } else if (autoSpinMode === "multiline-slot") {
      result = await spinMultiLine();
    } else if (autoSpinMode === "risk") {
      result = await spinRiskGame();
    }

    if (result.stopAutoSpin) {
      stopAutoSpin();
      if (result.stopReason) {
        setMessage(result.stopReason);
      }
      return;
    }

    if (result.success) {
      setAutoSpinRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          stopAutoSpin();
          return 0;
        }
        return next;
      });
    } else {
      stopAutoSpin();
    }
  }, 1000);

  return () => {
    if (autoSpinTimeoutRef.current) {
      clearTimeout(autoSpinTimeoutRef.current);
      autoSpinTimeoutRef.current = null;
    }
  };
}, [autoSpinRunning, autoSpinMode, autoSpinRemaining, spinning, riskRunning, openingBusy, data.tokens]);

const [riskSelectedItem, setRiskSelectedItem] = useState<LocalSymbol | null>(null);
const [riskGameOver, setRiskGameOver] = useState(false);
const [riskCashedOut, setRiskCashedOut] = useState(false);
const [lastWonItem, setLastWonItem] = useState<LocalInventoryItem | null>(null);
const [riskGiftRarity, setRiskGiftRarity] = useState<LocalSymbol["rarity"] | null>(null);
const [riskOffset, setRiskOffset] = useState(0);

const riskLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const riskViewportRef = useRef<HTMLDivElement | null>(null);
const riskSpinCursorRef = useRef(RISK_BUFFER_LEFT);
const riskGameStripRef = useRef<LocalSymbol[]>([]);

const [riskStrip, setRiskStrip] = useState<LocalSymbol[]>([]);

useEffect(() => {
  const freshStrip = buildRiskStrip(RISK_VISIBLE_COUNT * 6);
  riskGameStripRef.current = freshStrip;
  setRiskStrip(freshStrip);
}, [riskAllSymbols]);
const [selectedMember, setSelectedMember] = useState<MemberInventory | null>(null);
const [adminScores, setAdminScores] = useState<Record<string, { scoreA: string; scoreB: string }>>({});
  const [challengeTargetItem, setChallengeTargetItem] =
    useState<MemberInventoryItem | null>(null);
  
    const [challengeTargetUser, setChallengeTargetUser] =
    useState<MemberInventory | null>(null);
  const [showChallengePicker, setShowChallengePicker] = useState(false);

  const [incomingChallenges, setIncomingChallenges] = useState<ChallengeType[]>([]);
  const [outgoingChallenges, setOutgoingChallenges] = useState<ChallengeType[]>([]);
  const [allChallenges, setAllChallenges] = useState<ChallengeType[]>([]);

  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeType | null>(null);
  const [roundUi, setRoundUi] = useState<FirstshotUiState>("idle");
  const [roundFeedback, setRoundFeedback] = useState("");
  const [firstshotRound, setFirstshotRound] = useState<FirstshotRoundState | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const [adminDraft, setAdminDraft] = useState({
  teamA: "",
  teamB: "",
  startsAt: "20:00",
  date: getTodayInputValue(),
  oddA: "1.67",
  oddB: "2.10",
});


  const updateData = (updater: LocalData | ((prev: LocalData) => LocalData)) => {
    setData((prev) => (typeof updater === "function" ? updater(prev) : updater));
  };

  const loadAllItems = async () => {
    const { data, error } = await supabase
      .from("items")
.select("id, slug, name, rarity, image_path, category, detail_text, weight, is_active, slot_enabled, multiline_enabled, risk_enabled")      .order("name", { ascending: true });

    if (error) {
      setMessage(error.message);
      setAllItemCatalog([]);
      return;
    }

    setAllItemCatalog(data || []);
  };

  const uploadAdminItem = async () => {
  if (!isAdmin) {
    setMessage("Kein Admin-Zugriff.");
    return;
  }

  if (!newItemFile) {
    setMessage("Bitte eine PNG-Datei auswählen.");
    return;
  }

  if (newItemFile.type !== "image/png") {
    setMessage("Bitte nur PNG-Dateien hochladen.");
    return;
  }

  if (!newItemName.trim()) {
    setMessage("Bitte einen Item-Namen eingeben.");
    return;
  }

  const slug = slugifyItemName(newItemName);
  if (!slug) {
    setMessage("Ungültiger Item-Name.");
    return;
  }

  try {
    setUploadingItem(true);
    setMessage("");

    const filePath = `${slug}.png`;

    const { error: uploadError } = await supabase.storage
      .from("item-images")
      .upload(filePath, newItemFile, {
        upsert: true,
        contentType: "image/png",
      });

    if (uploadError) {
      setMessage(`Upload fehlgeschlagen: ${uploadError.message}`);
      return;
    }

    const { error: insertError } = await supabase.from("items").upsert(
      {
        slug,
        name: newItemName.trim(),
        rarity: newItemRarity,
        image_path: filePath,
        category: newItemCategory.trim() || null,
        detail_text: newItemDetailText.trim() || null,
        is_active: true,
        slot_enabled: true,
        multiline_enabled: false,
        weight: 1,
      },
      {
        onConflict: "slug",
      }
    );

    if (insertError) {
      setMessage(`Item konnte nicht gespeichert werden: ${insertError.message}`);
      return;
    }

    setNewItemFile(null);
    setNewItemName("");
    setNewItemRarity("Common");
    setNewItemCategory("");
    setNewItemDetailText("");

    await loadAllItems();
    setMessage("Item erfolgreich hochgeladen.");
  } finally {
    setUploadingItem(false);
  }
};
const loadAppConfig = async () => {
  const { data: row, error } = await supabase
    .from("app_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    setMessage(error.message);
    return;
  }

  if (!row) return;

  setData((prev) => ({
    ...prev,
    currentWeek: isAdmin ? prev.currentWeek : row.current_week ?? 1,
    currentMajor: isAdmin ? prev.currentMajor : row.current_major ?? "major1",
    stageLabel: row.stage_label ?? "Major I",
    sourceLabel: row.source_label ?? "Supabase",
    lastSyncLabel: row.last_sync_label ?? "Online",
  }));
};
const autoLockExpiredMatches = async () => {
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from("matches")
    .update({ locked: true })
    .eq("locked", false)
    .lt("starts_at", nowIso);

  if (error) {
    setMessage(error.message);
  }
};

  
const loadMatches = async () => {
  const { data: rows, error } = await supabase
    .from("matches")
    .select("*")
    .order("starts_at", { ascending: true });

  if (error) {
    setMessage(error.message);
    return;
  }

  const grouped: Record<string, Record<number, MatchType[]>> = {
    major1: {},
    major2: {},
    major3: {},
    major4: {},
    champs: {},
  };

  (rows || []).forEach((row: any) => {
    const major = String(row.major || "major1").trim().toLowerCase();
    const week = Number(row.week || 1);

    if (!grouped[major]) grouped[major] = {};
    if (!grouped[major][week]) grouped[major][week] = [];

    const date = new Date(row.starts_at);
    const formatted = date.toLocaleString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    grouped[major][week].push({
      id: String(row.id),
      week,
      teamA: row.team_a,
      teamB: row.team_b,
      startsAt: formatted.replace(",", " ·"),
      startsAtIso: new Date(row.starts_at).toISOString(),
      locked: !!row.locked,
      result: row.result as MatchResult,
      scoreA: typeof row.score_a === "number" ? row.score_a : null,
      scoreB: typeof row.score_b === "number" ? row.score_b : null,
      oddA: row.odd_a != null ? Number(row.odd_a) : null,
      oddB: row.odd_b != null ? Number(row.odd_b) : null,
    });
  });

  console.log("MATCH ROWS RAW:", rows);
  console.log("GROUPED MATCHES:", grouped);

  setData((prev) => ({
    ...prev,
    weeks: grouped,
  }));
};

  const loadRemoteUserGameState = async (uid: string) => {
    
    const [
  { data: profile, error: profileError },
  { data: picksRows, error: picksError },
  { data: rewardRows, error: rewardError },
  { data: spinRows, error: spinError },
  { data: invRows, error: invError },
] = await Promise.all([
  supabase
  .from("profiles")
  .select("username, display_name, avatar_url, tokens")
  .eq("id", uid)
  .maybeSingle(),
  supabase.from("user_picks").select("match_id, pick_side").eq("user_id", uid),
  supabase.from("match_rewards").select("match_id").eq("user_id", uid),
  supabase
    .from("spin_history")
    .select("created_at, reels, won")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(12),
  supabase
    .from("inventory_items")
    .select("id, owner_id, items(id, slug, name, rarity, image_path, weight)")
    .eq("owner_id", uid)
    .eq("status", "owned"),
]);

    if (profileError) setMessage(profileError.message);
    if (picksError) setMessage(picksError.message);
    if (rewardError) setMessage(rewardError.message);
    if (spinError) setMessage(spinError.message);
    if (invError) setMessage(invError.message);

    const picksMap: Record<string, PickSide> = {};
(picksRows || []).forEach((row: any) => {
  picksMap[String(row.match_id)] = row.pick_side as PickSide;
});

const resolvedMatchIds = (rewardRows || []).map((r: any) => String(r.match_id));

    const spinHistory =
      (spinRows || []).map((row: any) => ({
        at: new Date(row.created_at).getTime(),
        reels: Array.isArray(row.reels) ? row.reels : [],
        won: !!row.won,
      })) || [];

    const inventory: LocalInventoryItem[] = [];
    (invRows || []).forEach((row: any) => {
      const item = Array.isArray(row.items) ? row.items[0] : row.items;
      if (!item) return;

      inventory.push({
  inventory_id: row.id,
  id: item.slug,
  slug: item.slug,
  name: item.name,
  rarity: normalizeRarity(item.rarity) as LocalInventoryItem["rarity"],
  image_path: item.image_path,
  weight: item.weight ?? 1,
});
    });

    setData((prev) => ({
  ...prev,
  picks: picksMap,
  resolvedMatchIds,
  tokens: profile?.tokens ?? 0,
  inventory,
  spinHistory,
}));

    if (profile) {
  const nextName = profile.display_name || profile.username || "";
  setProfileName(profile.username || nextName);
  setDisplayName(nextName);
  setAvatarUrl(profile.avatar_url || "");
  setNeedsUsername(!nextName);
}
  };

  const setPickOnline = async (matchId: string, side: PickSide) => {
  if (!userId) {
    setMessage("Bitte zuerst mit Google anmelden.");
    return;
  }

  const allCurrentMatches = Object.values(data.weeks)
    .flatMap((weekMap) => Object.values(weekMap).flat())
    .filter(Boolean);

  const targetMatch = allCurrentMatches.find((m) => m.id === matchId);

  if (!targetMatch) {
    setMessage("Match nicht gefunden.");
    return;
  }

  if (isMatchLocked(targetMatch)) {
    setMessage("Dieses Match ist bereits gesperrt.");
    return;
  }

  const { error } = await supabase.from("user_picks").upsert(
    {
      user_id: userId,
      match_id: matchId,
      pick_side: side,
    },
    { onConflict: "user_id,match_id" }
  );

  if (error) {
    setMessage(error.message);
    return;
  }

  updateData((prev) => ({
    ...prev,
    picks: { ...prev.picks, [matchId]: side },
  }));
};const currentWeek = data.currentWeek;

const currentMajor =
  majorStructure.find((m) => m.id === data.currentMajor) || majorStructure[0];

const visibleWeeks = currentMajor.weeks;

const currentWeekMatches = data.weeks[data.currentMajor]?.[currentWeek] || [];

const matches = isAdmin
  ? currentWeekMatches
  : currentWeekMatches.length > 0
    ? currentWeekMatches
    : Object.values(data.weeks[data.currentMajor] || {}).find(
        (list) => Array.isArray(list) && list.length > 0
      ) || [];

const upcomingHomeMatches = matches.filter((match) => !hasSavedScore(match));
const completedHomeMatches = matches.filter((match) => hasSavedScore(match));
const activeGroup = myGroups.find((g) => g.id === activeGroupId) || null;

const pendingRewardMatches = matches.filter((m) =>
  isMatchClaimable(m, data.resolvedMatchIds)
);

const hasPendingRewards = pendingRewardMatches.length > 0;

const memberNameMap = useMemo(() => {
  const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.username));
    return map;
  }, [members]);

  const inventoryLookup = useMemo(() => {
    const map = new Map<
      string,
      { ownerId: string; ownerName: string; item: MemberInventoryItem }
    >();

    memberInventories.forEach((entry) => {
      entry.items.forEach((item) => {
        map.set(item.inventory_id, {
          ownerId: entry.user_id,
          ownerName: entry.username,
          item,
        });
      });
    });

    return map;
  }, [memberInventories]);

  const getInventoryMeta = (inventoryId?: string | null) => {
    if (!inventoryId) return null;
    return inventoryLookup.get(inventoryId) || null;
  };

  const selectedChallengeFresh =
    (selectedChallenge && allChallenges.find((c) => c.id === selectedChallenge.id)) ||
    selectedChallenge;

  const activeChallengeStatuses = ["pending", "accepted", "second_turn"];

  const isInventoryItemLocked = (inventoryId: string) => {
    return allChallenges.some((challenge) => {
      if (!activeChallengeStatuses.includes(challenge.status)) return false;

      const isMine =
        challenge.from_user_id === userId || challenge.to_user_id === userId;

      if (!isMine) return false;

      return (
        challenge.requested_inventory_item_id === inventoryId ||
        challenge.offered_inventory_item_id === inventoryId
      );
    });
  };

  const getChallengeDisplayMeta = (challenge: ChallengeType) => {
    const fromName = memberNameMap.get(challenge.from_user_id) || "Unbekannt";
    const toName = memberNameMap.get(challenge.to_user_id) || "Unbekannt";

    const offered = getInventoryMeta(challenge.offered_inventory_item_id);
    const requested = getInventoryMeta(challenge.requested_inventory_item_id);

    return {
      fromName,
      toName,
      offeredName: offered?.item.name || "Unbekannt",
      requestedName: requested?.item.name || "Unbekannt",
      offeredImage: offered?.item.image_path || "/items/fallback.png",
      requestedImage: requested?.item.image_path || "/items/fallback.png",
    };
  };

  const getDisplayWeek = (week: number) => {
  if (week === 8) return "Bracket";
  return `W${week}`;
};

  const correctCount = useMemo(
  () =>
    matches.filter(
      (m) =>
        data.picks[String(m.id)] &&
        hasMatchResult(m) &&
        data.picks[String(m.id)] === m.result
    ).length,
  [matches, data.picks]
);

const totalPicked = useMemo(
  () => matches.filter((m) => data.picks[String(m.id)]).length,
  [matches, data.picks]
);

  

  const ownedItemSlugs = useMemo(() => {
  return new Set(data.inventory.map((item) => item.slug));
}, [data.inventory]);

const inventoryCountMap = useMemo(() => {
  const map = new Map<string, number>();

  data.inventory.forEach((item) => {
    map.set(item.slug, (map.get(item.slug) || 0) + 1);
  });

  return map;
}, [data.inventory]);

const inventoryDisplayItems = useMemo(() => {
  const rarityRank = {
    Common: 1,
    Rare: 2,
    Epic: 3,
    Super: 4,
    Legendary: 5,
    Ultra: 6,
  };

  const normalMap = new Map<
    string,
    LocalInventoryItem & { quantity: number; newestAt: number; isBox: false }
  >();

  const boxItems: (LocalInventoryItem & {
    quantity: number;
    newestAt: number;
    isBox: true;
  })[] = [];

  data.inventory.forEach((item, index) => {
    const newestAt = data.inventory.length - index;

    if (isMysteryBoxSlug(item.slug)) {
      boxItems.push({
        ...item,
        quantity: 1,
        newestAt,
        isBox: true,
      });
      return;
    }

    const existing = normalMap.get(item.slug);
    if (existing) {
      existing.quantity += 1;
      if (newestAt > existing.newestAt) {
        existing.newestAt = newestAt;
      }
    } else {
      normalMap.set(item.slug, {
        ...item,
        quantity: 1,
        newestAt,
        isBox: false,
      });
    }
  });

  let items = [...Array.from(normalMap.values()), ...boxItems];

  if (inventoryFilter === "boxes") {
    items = items.filter((item) => item.isBox);
  } else if (inventoryFilter !== "all") {
    items = items.filter((item) => normalizeRarity(item.rarity) === inventoryFilter);
  }

  items.sort((a, b) => {
    if (inventorySort === "latest") {
      return b.newestAt - a.newestAt;
    }

    const aRank = rarityRank[normalizeRarity(a.rarity) as keyof typeof rarityRank] || 0;
    const bRank = rarityRank[normalizeRarity(b.rarity) as keyof typeof rarityRank] || 0;

    if (inventorySort === "rarity-asc") {
      if (aRank !== bRank) return aRank - bRank;
    } else {
      if (aRank !== bRank) return bRank - aRank;
    }

    if (a.isBox !== b.isBox) {
      return a.isBox ? 1 : -1;
    }

    return a.name.localeCompare(b.name, "de");
  });

  return items;
}, [data.inventory, inventoryFilter, inventorySort]);
const inventoryCounts = useMemo(() => {
    const map = new Map<string, LocalInventoryItem & { quantity: number }>();

    data.inventory.forEach((item) => {
      const existing = map.get(item.id);
      if (existing) existing.quantity += 1;
      else map.set(item.id, { ...item, quantity: 1 });
    });

    const rarityRank = {
  Ultra: 6,
  Legendary: 5,
  Super: 4,
  Epic: 3,
  Rare: 2,
  Common: 1,
};

    return Array.from(map.values()).sort(
      (a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0)
    );
  }, [data.inventory]);

  const topItem = inventoryCounts[0];

  const myOnlineInventory = data.inventory.map((item) => ({
  inventory_id: item.inventory_id,
  name: item.name,
  rarity: item.rarity,
  image_path: item.image_path,
  slug: item.slug,
  category: null,
}));

  const groupRows = members.map((member) => ({
    ...member,
    tokens: member.user_id === userId ? data.tokens : 0,
    correct: member.user_id === userId ? correctCount : 0,
    top: member.user_id === userId ? topItem?.rarity || "-" : "-",
    isMe: member.user_id === userId,
  }));

  const changeWeek = async (week: number) => {
  updateData((prev) => ({
    ...prev,
    currentWeek: week,
  }));

  if (!isAdmin) return;

  const { error } = await supabase
    .from("app_config")
    .update({
      current_week: week,
    })
    .eq("id", 1);

  if (error) {
    setMessage(error.message);
  }
};

  const changeMajor = async (majorId: string) => {
  const major = majorStructure.find((entry) => entry.id === majorId);
  if (!major) return;

  const allowedWeeks = major.weeks.map((w) => w.id);

  let nextWeek = data.currentWeek;

  if (!allowedWeeks.includes(nextWeek)) {
    nextWeek = major.weeks[0]?.id || 1;
  }

  if (!isAdmin) {
    const firstFilledWeek =
      Number(
        Object.keys(data.weeks[majorId] || {}).find(
          (weekKey) => (data.weeks[majorId]?.[Number(weekKey)] || []).length > 0
        )
      ) || nextWeek;

    nextWeek = firstFilledWeek;
  }

  updateData((prev) => ({
    ...prev,
    currentMajor: majorId,
    currentWeek: nextWeek,
  }));

  if (!isAdmin) return;

  const { error } = await supabase
    .from("app_config")
    .update({
      current_major: majorId,
      current_week: nextWeek,
    })
    .eq("id", 1);

  if (error) {
    setMessage(error.message);
  }
};

  const setPick = async (matchId: string, side: PickSide) => {
  await setPickOnline(matchId, side);
};

  const resolveWeek = async () => {
  if (!userId) {
    setMessage("Bitte zuerst mit Google anmelden.");
    return;
  }

  const claimableMatches = matches.filter((m) =>
  isMatchClaimable(m, data.resolvedMatchIds)
);

  if (!claimableMatches.length) {
    setMessage("Keine gesperrten, noch nicht ausgewerteten Matches vorhanden.");
    return;
  }

  let earned = 0;

  const rewardRows = claimableMatches.map((match) => {
    const pick = data.picks[String(match.id)];
    const won = pick && match.result && pick === match.result;
    const tokensForMatch = won ? 5 : 0;

    earned += tokensForMatch;

    return {
      user_id: userId,
      match_id: match.id,
      rewarded_tokens: tokensForMatch,
    };
  });

  const { error: rewardInsertError } = await supabase
    .from("match_rewards")
    .insert(rewardRows);

  if (rewardInsertError) {
    setMessage(rewardInsertError.message);
    return;
  }

  const nextTokens = data.tokens + earned;

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ tokens: nextTokens })
    .eq("id", userId);

  if (profileUpdateError) {
    setMessage(profileUpdateError.message);
    return;
  }

  updateData((prev) => ({
    ...prev,
    tokens: nextTokens,
    resolvedMatchIds: [
      ...prev.resolvedMatchIds,
      ...claimableMatches.map((m) => String(m.id)),
    ],
  }));

  setMessage(
    earned > 0
      ? `${claimableMatches.length} Match(es) ausgewertet. +${earned} Tokens`
      : `${claimableMatches.length} Match(es) ausgewertet. Keine Tokens erhalten.`
  );
};

  

  const addMatch = async (e: React.FormEvent) => {
  e.preventDefault();
  setMessage("");

  if (!isAdmin) {
  setMessage("Kein Admin-Zugriff.");
  return;
}
if (!adminDraft.teamA.trim()) {
    setMessage("Bitte Team A auswählen.");
    return;
  }

  if (!adminDraft.teamB.trim()) {
    setMessage("Bitte Team B auswählen.");
    return;
  }

  if (!adminDraft.date.trim()) {
    setMessage("Bitte Datum auswählen.");
    return;
  }

  if (!adminDraft.startsAt.trim()) {
    setMessage("Bitte Uhrzeit auswählen.");
    return;
  }

  if (adminDraft.teamA === adminDraft.teamB) {
    setMessage("Bitte zwei unterschiedliche Teams wählen.");
    return;
  }

  const localDateTime = new Date(`${adminDraft.date}T${adminDraft.startsAt}:00`);

if (Number.isNaN(localDateTime.getTime())) {
  setMessage("Ungültiges Datum oder Uhrzeit.");
  return;
}

const oddA = Number(adminDraft.oddA);
const oddB = Number(adminDraft.oddB);

if (!Number.isFinite(oddA) || oddA <= 1) {
  setMessage("Bitte eine gültige Quote für Team A eingeben.");
  return;
}

if (!Number.isFinite(oddB) || oddB <= 1) {
  setMessage("Bitte eine gültige Quote für Team B eingeben.");
  return;
}
const payload = {
  week: currentWeek,
  major: data.currentMajor,
  team_a: adminDraft.teamA.trim(),
  team_b: adminDraft.teamB.trim(),
  starts_at: localDateTime.toISOString(),
  locked: false,
  result: null,
  odd_a: oddA,
  odd_b: oddB,
};

  const { data: insertedMatch, error } = await supabase
  .from("matches")
  .insert(payload)
  .select()
  .single();

console.log("INSERTED MATCH:", insertedMatch);
console.log("INSERT PAYLOAD:", payload);

  if (error) {
    console.error("MATCH INSERT ERROR:", error);
    setMessage(`Match konnte nicht erstellt werden: ${error.message}`);
    return;
  }

  setMessage("Match erfolgreich erstellt.");

  setAdminDraft({
  teamA: "",
  teamB: "",
  startsAt: "20:00",
  date: getTodayInputValue(),
  oddA: "1.67",
  oddB: "2.10",
});

  await loadMatches();
};
const payoutBet = async (bet: BetType) => {
  if (!userId) {
    setMessage("Bitte zuerst mit Google anmelden.");
    return;
  }

  if (bet.status !== "won" || bet.paid_out) {
    return;
  }

  const nextTokens = data.tokens + bet.potential_payout;

  const { error: tokenError } = await supabase
    .from("profiles")
    .update({ tokens: nextTokens })
    .eq("id", userId);

  if (tokenError) {
    setMessage(tokenError.message);
    return;
  }

  const { error: betError } = await supabase
    .from("bets")
    .update({
      status: "paid",
      paid_out: true,
    })
    .eq("id", bet.id);

  if (betError) {
    setMessage(betError.message);
    return;
  }

  setData((prev) => ({
    ...prev,
    tokens: nextTokens,
    bets: prev.bets.map((b) =>
      b.id === bet.id ? { ...b, status: "paid", paid_out: true } : b
    ),
  }));

  setMessage(`Gewinn ausgezahlt: +${bet.potential_payout} Tokens`);
};
  const loadUserBets = async (uid: string) => {
  
const { data: betRows, error: betError } = await supabase
    .from("bets")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (betError) {
    setMessage(betError.message);
    return;
  }

  const betIds = (betRows || []).map((row: any) => row.id);

  if (!betIds.length) {
    setData((prev) => ({ ...prev, bets: [] }));
    return;
  }

  const { data: legRows, error: legError } = await supabase
    .from("bet_legs")
    .select("*")
    .in("bet_id", betIds);

  if (legError) {
    setMessage(legError.message);
    return;
  }

  const legsByBet = new Map<string, BetLegType[]>();

  (legRows || []).forEach((row: any) => {
    const list = legsByBet.get(row.bet_id) || [];
    list.push({
      id: row.id,
      bet_id: row.bet_id,
      match_id: String(row.match_id),
      pick_side: row.pick_side as PickSide,
      odd: Number(row.odd),
    });
    legsByBet.set(row.bet_id, list);
  });

  const bets: BetType[] = (betRows || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    stake: row.stake,
    total_odds: Number(row.total_odds),
    potential_payout: row.potential_payout,
    status: row.status as BetStatus,
    paid_out: !!row.paid_out,
    created_at: row.created_at,
    legs: legsByBet.get(row.id) || [],
  }));

  setData((prev) => ({ ...prev, bets }));
};
const deleteMatch = async (matchId: string) => {
    if (!isAdmin) {
  setMessage("Kein Admin-Zugriff.");
  return;
}
await supabase.from("user_picks").delete().eq("match_id", matchId);

    const { error } = await supabase.from("matches").delete().eq("id", matchId);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadMatches();
  };

  const updateMatch = async <K extends keyof MatchType>(
  matchId: string,
  field: K,
  value: MatchType[K]
) => {
  if (!isAdmin) {
    setMessage("Kein Admin-Zugriff.");
    return;
  }

  const updatePayload: Record<string, any> = {};

  if (field === "teamA") updatePayload.team_a = value;
  else if (field === "teamB") updatePayload.team_b = value;
  else if (field === "locked") updatePayload.locked = value;
  else if (field === "result") updatePayload.result = value;
  else if (field === "oddA") updatePayload.odd_a = value;
  else if (field === "oddB") updatePayload.odd_b = value;
  else if (field === "startsAt") {
    setMessage("startsAt bitte direkt in DB mit starts_at bearbeiten.");
    return;
  } else {
    return;
  }

  const { error } = await supabase
    .from("matches")
    .update(updatePayload)
    .eq("id", matchId);

  if (error) {
    setMessage(error.message);
    return;
  }

  await loadMatches();
};

  const saveMatchResult = async (matchId: string) => {
  if (!isAdmin) {
    setMessage("Kein Admin-Zugriff.");
    return;
  }

  const draft = adminScores[matchId] || { scoreA: "", scoreB: "" };
  const scoreA = Number(draft.scoreA);
  const scoreB = Number(draft.scoreB);

  if (!isValidMatchScore(scoreA, scoreB)) {
    setMessage("Ungültiges Ergebnis. Erlaubt sind ganze Zahlen von 0 bis 9, kein Unentschieden.");
    return;
  }

  const result = getResultFromScore(scoreA, scoreB);

  const { error } = await supabase
    .from("matches")
    .update({
      score_a: scoreA,
      score_b: scoreB,
      result,
      locked: true,
    })
    .eq("id", matchId);

  if (error) {
    setMessage(error.message);
    return;
  }

  await loadMatches();

  if (userId) {
    await evaluateUserBets(userId);
  }

  setMessage("Ergebnis gespeichert.");
};
const resetAll = async () => {
    if (!isAdmin) {
  setMessage("Kein Admin-Zugriff.");
  return;
}
if (!userId) {
      setMessage("Bitte zuerst einloggen.");
      return;
    }

    if (!confirm("Willst du wirklich deine Online-Daten zurücksetzen?")) return;

    await Promise.all([
      supabase.from("user_picks").delete().eq("user_id", userId),
      supabase.from("week_resolutions").delete().eq("user_id", userId),
      supabase.from("match_rewards").delete().eq("user_id", userId),
      supabase.from("spin_history").delete().eq("user_id", userId),
      supabase.from("inventory_items").delete().eq("owner_id", userId),
      supabase.from("profiles").update({ tokens: 0 }).eq("id", userId),
    ]);

    setData((prev) => ({
      ...prev,
      picks: {},
      resolvedMatchIds: [],
      tokens: 0,
      inventory: [],
      spinHistory: [],
    }));

    setLastWin(null);
    setScreen("home");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "call-of-picks-online-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openMysteryBox = async (box: LocalInventoryItem) => {
  if (!userId || openingBusy) return;
playMysteryLoadupSound();
  setOpeningBusy(true);
  setOpeningBox(box);
  setOpeningReward(null);
  setOpeningPhase("build");

  const rarity = normalizeRarity(box.rarity);

  const pool = allItemCatalog.filter(
    (item) =>
      normalizeRarity(item.rarity) === rarity &&
      !item.slug.startsWith("mysterybox")
  );

  if (!pool.length) {
    setMessage("Keine Items für diese Rarity gefunden.");
    setOpeningBusy(false);
    setOpeningBox(null);
    setOpeningPhase("idle");
    return;
  }

  const reward = pool[Math.floor(Math.random() * pool.length)];

  // Build-up Zeit
  await new Promise((resolve) => setTimeout(resolve, 1550));
setOpeningPhase("flash");

await new Promise((resolve) => setTimeout(resolve, 180));
setOpeningPhase("reveal");
playMysteryRevealSounds();

setTimeout(() => {
  playAlienSound();
}, 1600);

  const { error: deleteError } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", box.inventory_id);

  if (deleteError) {
    setMessage(deleteError.message);
    setOpeningBusy(false);
    setOpeningBox(null);
    setOpeningPhase("idle");
    return;
  }

  const { data: rewardItemRow, error: rewardLookupError } = await supabase
    .from("items")
    .select("id, slug, name, rarity, image_path, weight")
    .eq("slug", reward.slug)
    .maybeSingle();

  if (rewardLookupError || !rewardItemRow?.id) {
    setMessage("Belohnungsitem konnte nicht gefunden werden.");
    setOpeningBusy(false);
    setOpeningBox(null);
    setOpeningPhase("idle");
    return;
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from("inventory_items")
    .insert({
      owner_id: userId,
      item_id: rewardItemRow.id,
      status: "owned",
    })
    .select("id")
    .single();

  if (insertError) {
    setMessage(insertError.message);
    setOpeningBusy(false);
    setOpeningBox(null);
    setOpeningPhase("idle");
    return;
  }

  const rewardInventoryItem: LocalInventoryItem = {
    inventory_id: insertedRow.id,
    id: rewardItemRow.slug,
    slug: rewardItemRow.slug,
    name: rewardItemRow.name,
    rarity: normalizeRarity(rewardItemRow.rarity) as LocalInventoryItem["rarity"],
    image_path: rewardItemRow.image_path,
    weight: rewardItemRow.weight ?? 1,
  };

  updateData((prev) => ({
    ...prev,
    inventory: [
      rewardInventoryItem,
      ...prev.inventory.filter((i) => i.inventory_id !== box.inventory_id),
    ],
  }));

  setOpeningReward(rewardInventoryItem);
  setMessage(`🎁 Du hast ${rewardItemRow.name} erhalten!`);
  setOpeningBusy(false);
};
const grantServerMysteryBoxByRarity = async (
  rarity: LocalInventoryItem["rarity"]
) => {
  if (!userId) return null;

  const slug = getMysteryBoxSlugByRarity(rarity);

  const { data: itemRow, error } = await supabase
    .from("items")
    .select("id, slug, name, rarity, image_path, weight")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !itemRow?.id) {
    setMessage(`Mystery Box (${slug}) konnte nicht gefunden werden.`);
    return null;
  }

  const { error: insertError } = await supabase.from("inventory_items").insert({
    owner_id: userId,
    item_id: itemRow.id,
    status: "owned",
  });

  if (insertError) {
    setMessage(insertError.message);
    return null;
  }

  const boxItem = {
    inventory_id: `mysterybox-${Date.now()}`,
    id: itemRow.slug,
    slug: itemRow.slug,
    name: itemRow.name,
    rarity: normalizeRarity(itemRow.rarity) as LocalInventoryItem["rarity"],
    image_path: itemRow.image_path,
    weight: itemRow.weight ?? 1,
  };

  updateData((prev) => ({
    ...prev,
    inventory: [boxItem, ...prev.inventory],
  }));

  return boxItem;
};

const rewardFirelineBox = async () => {
  const rarity = getWeightedFirelineBoxRarity();
  const box = await grantServerMysteryBoxByRarity(rarity);

  if (box) {
    const notice = `Killstreak! Du hast eine ${rarity}-Mystery Box erhalten!`;
    setMessage(notice);
    setLastWonItem(box);
    setFirelineRewardNotice(notice);

    setTimeout(() => {
      setFirelineRewardNotice("");
    }, 3000);

    return true;
  } else {
    setMessage("Fireline voll, aber die Mystery Box konnte nicht vergeben werden.");
    return false;
  }
};
const FIRELINE_MAX = 5;

const increaseFirelineProgress = async () => {
  const currentProgress = Number(data.firelineProgress || 0);
  const nextProgress = Math.min(currentProgress + 1, FIRELINE_MAX);

  updateData((prev) => ({
    ...prev,
    firelineProgress: nextProgress,
  }));

  if (nextProgress >= FIRELINE_MAX) {
    const rewarded = await rewardFirelineBox();

    if (rewarded) {
      await new Promise((resolve) => setTimeout(resolve, 700));

      updateData((prev) => ({
        ...prev,
        firelineProgress: 0,
      }));

      await loadRemoteUserGameState(userId);
    }
  }
};
const grantServerInventoryItem = async (symbol: LocalSymbol) => {
  if (!userId) return;

  const { data: itemRow, error } = await supabase
    .from("items")
    .select("id")
    .eq("slug", symbol.slug)
    .maybeSingle();

    if (error || !itemRow?.id) return;

    await supabase.from("inventory_items").insert({
      owner_id: userId,
      item_id: itemRow.id,
      status: "owned",
    });

    if (activeGroupId) {
      await loadGroupDetails(activeGroupId);
    }

    await loadRemoteUserGameState(userId);
  };

  const pushSpinHistoryOnline = async (reels: string[], won: boolean) => {
    if (!userId) return;

    await supabase.from("spin_history").insert({
      user_id: userId,
      reels,
      won,
    });
  };

  const updateTokensOnline = async (newTokens: number) => {
    if (!userId) return false;

    const { error } = await supabase
      .from("profiles")
      .update({ tokens: newTokens })
      .eq("id", userId);

    if (error) {
      setMessage(error.message);
      return false;
    }

    return true;
  };
const getRiskTokenReward = (symbol: LocalSymbol, stake: number) => {
  if (symbol.slug === "zombieteddy-ultra") return 0;

  const baseByRarity: Record<LocalSymbol["rarity"], number> = {
  Common: 1,
  Rare: 2,
  Epic: 4,
  Super: 5,
  Legendary: 7,
  Ultra: 0,
};

  return baseByRarity[symbol.rarity] * stake;
};

const getRiskGiftRarity = (streak: number): LocalSymbol["rarity"] | null => {
  if (streak >= 11) return "Legendary";
  if (streak >= 8) return "Epic";
  if (streak >= 6) return "Rare";
  if (streak >= 4) return "Common";
  return null;
};


const grantServerInventoryItemByRarity = async (rarity: LocalSymbol["rarity"]) => {
  if (!userId) return null;

  const pool = riskSafePool.filter((item) => item.rarity === rarity);
  if (!pool.length) return null;

  const chosen = pool[Math.floor(Math.random() * pool.length)];
  await grantServerInventoryItem(chosen);
  return chosen;
};

const resetRiskRound = () => {
  if (riskLoopRef.current) {
    clearTimeout(riskLoopRef.current);
    riskLoopRef.current = null;
  }

  const freshStrip = buildRiskStrip(RISK_VISIBLE_COUNT * 6);

  riskGameStripRef.current = freshStrip;
  riskSpinCursorRef.current = RISK_BUFFER_LEFT;

  setRiskRunning(false);
  setRiskPot(0);
  setRiskStreak(0);
  setRiskSelectedItem(null);
  setRiskSelectedIndex(null);
  setRiskGameOver(false);
  setRiskCashedOut(false);
  setLastWonItem(null);
  setRiskGiftRarity(null);
  setRiskStrip(freshStrip);
  setRiskOffset(0);
};

const cashoutRiskGame = async () => {
  if (!userId) {
    setMessage("Bitte zuerst mit Google anmelden.");
    return;
  }

  if (riskRunning) return;

  const nextGiftRarity = getRiskGiftRarity(riskStreak);
  const nextTokens = data.tokens + riskPot;

  const tokenSaved = await updateTokensOnline(nextTokens);
  if (!tokenSaved) return;

  updateData((prev) => ({
    ...prev,
    tokens: nextTokens,
  }));

  let wonGift: LocalInventoryItem | null = null;

if (nextGiftRarity) {
  const box = await grantServerMysteryBoxByRarity(nextGiftRarity);
  setRiskGiftRarity(nextGiftRarity);
  wonGift = box || null;
} else {
  setRiskGiftRarity(null);
}

  setRiskCashedOut(true);
  setLastWonItem(wonGift);

  setMessage(
    nextGiftRarity
      ? `Ausgezahlt: +${riskPot} Tokens und ein ${nextGiftRarity}-Geschenk!`
      : `Ausgezahlt: +${riskPot} Tokens`
  );

  setRiskPot(0);
  setRiskStreak(0);
  setRiskSelectedItem(null);
  setRiskSelectedIndex(null);
  setRiskGameOver(false);
  setRiskStrip(buildRiskStrip(RISK_VISIBLE_COUNT));
  setRiskOffset(0);
};

const getRiskTargetOffset = (
  landingIndex: number,
  visibleWidth: number
) => {
  const itemCenter = landingIndex * RISK_STEP + RISK_ITEM_WIDTH / 2;
  const lineCenter = visibleWidth / 2;
  return -(itemCenter - lineCenter);
};

const getNearestRiskIndex = (
  offset: number,
  visibleWidth: number,
  itemCount: number
) => {
  const lineCenter = visibleWidth / 2;
  const linePositionInStrip = lineCenter - offset;

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < itemCount; i++) {
    const itemCenter = i * RISK_STEP + RISK_ITEM_WIDTH / 2;
    const distance = Math.abs(itemCenter - linePositionInStrip);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
};
const spinRiskGame = async (): Promise<AutoSpinResult> => {
  if (!userId) {
    setMessage("Bitte zuerst mit Google anmelden.");
    return { success: false, stopAutoSpin: true, stopReason: "Kein Login" };
  }

  if (riskRunning || spinning) {
    return {
      success: false,
      stopAutoSpin: true,
      stopReason: "Spin läuft bereits.",
    };
  }

  if (riskStake <= 0) {
    setMessage("Bitte einen gültigen Einsatz wählen.");
    return {
      success: false,
      stopAutoSpin: true,
      stopReason: "Ungültiger Einsatz.",
    };
  }

  if (data.tokens < riskStake) {
    setMessage("Nicht genug Tokens.");
    return {
      success: false,
      stopAutoSpin: true,
      stopReason: "Nicht genug Tokens.",
    };
  }

  if (!riskSafePool.length) {
    setMessage("Keine gültigen Alles-Spitze-Items gefunden.");
    return {
      success: false,
      stopAutoSpin: true,
      stopReason: "Keine Risk-Items gefunden.",
    };
  }

  if (riskLoopRef.current) {
    clearTimeout(riskLoopRef.current);
    riskLoopRef.current = null;
  }

  const nextTokens = data.tokens - riskStake;
  const tokenSaved = await updateTokensOnline(nextTokens);
  if (!tokenSaved) {
    return {
      success: false,
      stopAutoSpin: true,
      stopReason: "Tokens konnten nicht aktualisiert werden.",
    };
  }

  updateData((prev) => ({ ...prev, tokens: nextTokens }));

  setRiskRunning(true);
  setRiskGameOver(false);
  setRiskCashedOut(false);
  setLastWonItem(null);
  setRiskGiftRarity(null);
  setRiskSelectedItem(null);
  setRiskSelectedIndex(null);

  const shouldBust = Math.random() < RISK_BUST_CHANCE;
  const landingSymbol = shouldBust
    ? zombieTeddySymbol
    : riskSafePool[Math.floor(Math.random() * riskSafePool.length)];

  let workingStrip = riskGameStripRef.current;
  let cursor = riskSpinCursorRef.current;

  const travelSteps = 8 + Math.floor(Math.random() * 5);
  const landingIndex = cursor + travelSteps;

  workingStrip = ensureRiskGameStripLength(
    workingStrip,
    landingIndex + RISK_BUFFER_LEFT + 20
  );

  workingStrip[landingIndex] = landingSymbol;

  riskGameStripRef.current = workingStrip;
  setRiskStrip(workingStrip);

  const visibleWidth = riskViewportRef.current?.clientWidth || 900;
  const targetOffset = getRiskTargetOffset(landingIndex, visibleWidth);

  setRiskOffset(targetOffset);

  return new Promise<AutoSpinResult>((resolve) => {
    riskLoopRef.current = setTimeout(() => {
      const finalIndex = getNearestRiskIndex(
        targetOffset,
        visibleWidth,
        workingStrip.length
      );

      const selected = workingStrip[finalIndex];
      setRiskSelectedItem(selected);
      setRiskSelectedIndex(finalIndex);
      riskSpinCursorRef.current = finalIndex;

      if (selected.slug === zombieTeddySymbol.slug) {
        setRiskPot(0);
        setRiskStreak(0);
        setRiskGameOver(true);
        setMessage("Zombie Teddy getroffen. Alles verloren.");
        setRiskRunning(false);
        riskLoopRef.current = null;

        resolve({
          success: true,
          stopAutoSpin: true,
          stopReason: "Zombie Teddy getroffen.",
        });
        return;
      }

      const reward = getRiskTokenReward(selected, riskStake);
      setRiskPot((prev) => prev + reward);
      setRiskStreak((prev) => prev + 1);
      setMessage(`${selected.name} erkannt. +${reward} Tokens in den Pot.`);

      setRiskRunning(false);
      riskLoopRef.current = null;
      resolve({ success: true });
    }, 2350);
  });
};
  


useEffect(() => {
  return () => {
    if (riskLoopRef.current) {
      clearTimeout(riskLoopRef.current);
    }
  };
}, []);
  
const firelineProgressValue = Number(data.firelineProgress || 0);
const firelinePercent = Math.min((firelineProgressValue / FIRELINE_MAX) * 100, 100);

const spin = async (): Promise<AutoSpinResult> => {
  if (!userId) {
    setMessage("Bitte zuerst mit Google anmelden.");
    return { success: false, stopAutoSpin: true, stopReason: "Kein Login" };
  }

  if (data.tokens < effectiveSlotCost || spinning) {
    return {
      success: false,
      stopAutoSpin: true,
      stopReason: "Nicht genug Tokens oder Spin läuft bereits.",
    };
  }

  setLastWin(null);
  setLastWins([]);

  const nextTokens = data.tokens - effectiveSlotCost;
  const tokenSaved = await updateTokensOnline(nextTokens);
  if (!tokenSaved) {
    return {
      success: false,
      stopAutoSpin: true,
      stopReason: "Tokens konnten nicht aktualisiert werden.",
    };
  }

  updateData((prev) => ({ ...prev, tokens: nextTokens }));

  const shouldUseClassicSpinSound = slotViewMode === "classic";
let currentSpinSoundId: number | undefined = undefined;

if (shouldUseClassicSpinSound) {
  playClassicSpinSound();
  currentSpinSoundId = classicSpinSoundIdRef.current;
} else {
  stopClassicSpinSound();
}

  setSpinning(true);

  const bonusChance = SLOT_BONUS_CHANCE[slotStake] || 0;

  return new Promise<AutoSpinResult>((resolve) => {
    const rolling = setInterval(() => {
      if (multiSlotMode) {
        setMultiReels([buildRandomRow(), buildRandomRow(), buildRandomRow()]);
      } else {
        setReels(buildRandomRow());
      }
    }, 100);

    setTimeout(async () => {
      clearInterval(rolling);

if (multiSlotMode) {
        let finalGrid = [buildRandomRow(), buildRandomRow(), buildRandomRow()];
finalGrid = finalGrid.map((row) => maybeUpgradeRowToWin(row, bonusChance));

const winningRows = finalGrid.filter(isWinningRow);
const wonSymbols = winningRows.map((row) => row[0]);
const hitCount = winningRows.length;

if (hitCount > 0) {
  playHitSound();

  
}

setMultiReels(finalGrid);

        const spinRecord = {
          at: Date.now(),
          reels: finalGrid.flat().map((r) => r.id),
          won: winningRows.length > 0,
        };

        await pushSpinHistoryOnline(spinRecord.reels, spinRecord.won);

        updateData((prev) => ({
          ...prev,
          tokens: nextTokens,
          inventory:
            winningRows.length > 0
              ? [
                  ...prev.inventory,
                  ...wonSymbols.map((symbol, index) => ({
                    inventory_id: `local-${Date.now()}-${index}`,
                    id: symbol.id,
                    slug: symbol.slug,
                    name: symbol.name,
                    rarity: symbol.rarity,
                    image_path: symbol.image_path,
                    weight: symbol.weight,
                  })),
                ]
              : prev.inventory,
          spinHistory: [spinRecord, ...prev.spinHistory].slice(0, 12),
        }));

        for (const symbol of wonSymbols) {
          await grantServerInventoryItem(symbol);
        }

        let shouldStopBecauseHighRarity = false;

        if (wonSymbols.length > 0) {
          setLastWins(wonSymbols);
          setLastWin(wonSymbols[0]);
          setMessage(`${hitCount} Treffer! ${wonSymbols.length} Item(s) gewonnen.`);
          shouldStopBecauseHighRarity = wonSymbols.some((symbol) =>
            isSuperOrHigher(symbol.rarity)
          );
        } else {
          setMessage("Kein Treffer.");
        }

        await increaseFirelineProgress();
        await loadRemoteUserGameState(userId);

        setSpinning(false);

        resolve({
          success: true,
          stopAutoSpin: shouldStopBecauseHighRarity,
          stopReason: shouldStopBecauseHighRarity
            ? "Super oder höher erhalten."
            : undefined,
        });
        return;
      }

      let finalReels = buildRandomRow();
finalReels = maybeUpgradeRowToWin(finalReels, bonusChance);

const win = isWinningRow(finalReels);

if (win) {
  playHitSound();
}

setReels(finalReels);
      const spinRecord = {
        at: Date.now(),
        reels: finalReels.map((r) => r.id),
        won: win,
      };

      await pushSpinHistoryOnline(spinRecord.reels, win);

      updateData((prev) => ({
        ...prev,
        inventory: win
          ? [
              ...prev.inventory,
              {
                inventory_id: `local-${Date.now()}`,
                id: finalReels[0].id,
                slug: finalReels[0].slug,
                name: finalReels[0].name,
                rarity: finalReels[0].rarity,
                image_path: finalReels[0].image_path,
                weight: finalReels[0].weight,
              },
            ]
          : prev.inventory,
        spinHistory: [spinRecord, ...prev.spinHistory].slice(0, 12),
      }));

      let shouldStopBecauseHighRarity = false;

      if (win) {
        setLastWin(finalReels[0]);
        setLastWins([finalReels[0]]);
        await grantServerInventoryItem(finalReels[0]);
        shouldStopBecauseHighRarity = isSuperOrHigher(finalReels[0].rarity);
      }

      await increaseFirelineProgress();
      await loadRemoteUserGameState(userId);

      setSpinning(false);
stopClassicSpinSound(currentSpinSoundId);
      resolve({
        success: true,
        stopAutoSpin: shouldStopBecauseHighRarity,
        stopReason: shouldStopBecauseHighRarity
          ? "Super oder höher erhalten."
          : undefined,
      });
    }, 1800);
  });
};

  const ensureProfile = async (uid: string, email: string) => {
    const { data: existing, error: fetchError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, tokens")
      .eq("id", uid)
      .maybeSingle();

    if (fetchError) {
      setMessage(fetchError.message);
      return;
    }

    if (!existing) {
      const fallbackName = email?.split("@")[0] || `user-${uid.slice(0, 8)}`;
      const { error: insertError } = await supabase.from("profiles").insert({
  id: uid,
  username: fallbackName,
  display_name: fallbackName,
  avatar_url: "",
  tokens: 0,
});

      if (insertError) {
        setMessage(insertError.message);
        return;
      }

      setProfileName(fallbackName);
setDisplayName(fallbackName);
setAvatarUrl("");
setNeedsUsername(false);
return;
    }

    const nextName = (existing as any)?.display_name || existing?.username || "";
setProfileName(existing?.username || nextName);
setDisplayName(nextName);
setAvatarUrl((existing as any)?.avatar_url || "");
setNeedsUsername(!nextName);
  };

  const loadGroupInventories = async (groupUserIds: string[]) => {
    if (!groupUserIds.length) {
      setMemberInventories([]);
      return;
    }

    const { data: profileRows, error: profileError } = await supabase
  .from("profiles")
  .select("id, username, display_name, avatar_url")
  .in("id", groupUserIds);

    if (profileError) {
      setMessage(profileError.message);
      return;
    }

    const { data: invRows, error: invError } = await supabase
      .from("inventory_items")
      .select("id, owner_id, items(slug, name, rarity, image_path, category)")
      .in("owner_id", groupUserIds)
      .eq("status", "owned");

    if (invError) {
      setMessage(invError.message);
      return;
    }

    const profileMap = new Map(
  ((profileRows || []) as any[]).map((p) => [
    p.id,
    {
      username: p.username || p.display_name || p.id,
      avatar_url: p.avatar_url || "",
    },
  ])
);

    const grouped = new Map<string, MemberInventory>();

    groupUserIds.forEach((uid) => {
  grouped.set(uid, {
    user_id: uid,
    username: profileMap.get(uid)?.username || uid,
    avatar_url: profileMap.get(uid)?.avatar_url || "",
    items: [],
  });
});

    ((invRows || []) as any[]).forEach((row) => {
      const entry = grouped.get(row.owner_id);
      if (!entry) return;

      const item = Array.isArray(row.items) ? row.items[0] : row.items;
      if (!item) return;

      entry.items.push({
  inventory_id: row.id,
  name: item.name,
  rarity: normalizeRarity(item.rarity),
  image_path: item.image_path,
  slug: item.slug,
  category: item.category,
});
    });

    setMemberInventories(Array.from(grouped.values()));
  };

  const loadChallenges = async (uid: string) => {
    if (!uid) {
      setIncomingChallenges([]);
      setOutgoingChallenges([]);
      setAllChallenges([]);
      return;
    }

    const { data: rows, error } = await supabase
      .from("firstshot_challenges")
      .select("*")
      .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    const allRows = (rows || []) as ChallengeType[];

    setAllChallenges(allRows);
    setIncomingChallenges(
      allRows.filter((row) => row.to_user_id === uid && row.status === "pending")
    );
    setOutgoingChallenges(allRows.filter((row) => row.from_user_id === uid));
  };

  const loadMyGroups = async (uid: string) => {
    const { data: memberships, error: membershipsError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", uid);

    if (membershipsError) {
      setMessage(membershipsError.message);
      return;
    }

    const groupIds = (memberships || []).map((m: any) => m.group_id);

    if (!groupIds.length) {
      setMyGroups([]);
      setActiveGroupId("");
      setMembers([]);
      setMemberInventories([]);
      await loadChallenges(uid);
      return;
    }

    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select("*")
      .in("id", groupIds);

    if (groupsError) {
      setMessage(groupsError.message);
      return;
    }

    const rows = (groups || []) as GroupType[];
    setMyGroups(rows);

    const nextActive =
      activeGroupId && rows.some((g) => g.id === activeGroupId)
        ? activeGroupId
        : rows[0]?.id || "";

    setActiveGroupId(nextActive);
    await loadChallenges(uid);
  };

  const loadGroupDetails = async (groupId: string) => {
  if (!groupId) {
    setMembers([]);
    setMemberInventories([]);
    return;
  }

  const { data: memberRows, error: memberRowsError } = await supabase
    .from("group_members")
.select("user_id")
    .eq("group_id", groupId);

  if (memberRowsError) {
    setMessage(memberRowsError.message);
    return;
  }

  const memberIds = (memberRows || []).map((row: any) => row.user_id);

  if (!memberIds.length) {
    setMembers([]);
    setMemberInventories([]);
    return;
  }

  const { data: profileRows, error: profileRowsError } = await supabase
  .from("profiles")
  .select("id, username, display_name, avatar_url, showcase_image_url")
  .in("id", memberIds);
  if (profileRowsError) {
    setMessage(profileRowsError.message);
    return;
  }

  const profileMap = new Map(
  (profileRows || []).map((p: any) => [
    p.id,
    {
      username: p.username || p.display_name || p.id,
      avatar_url: p.avatar_url || "",
      showcase_image_url: p.showcase_image_url || "",
    },
  ])
);

  

  const nextMembers = memberIds.map((id: string) => ({
  user_id: id,
  username: profileMap.get(id)?.username || id,
  avatar_url: profileMap.get(id)?.avatar_url || "",
  showcase_image_url: profileMap.get(id)?.showcase_image_url || "",
  isMe: id === userId,
}));

  setMembers(nextMembers);
  await loadGroupInventories(memberIds);
};

  useEffect(() => {
  const currentMatches = data.weeks[data.currentMajor]?.[data.currentWeek] || [];
  if (currentMatches.length > 0) return;

  for (const major of majorStructure) {
    const weekMap = data.weeks[major.id];
    if (!weekMap) continue;

    const firstFilledWeek = Object.entries(weekMap).find(
      ([, list]) => Array.isArray(list) && list.length > 0
    );

    if (firstFilledWeek) {
      setData((prev) => ({
        ...prev,
        currentMajor: major.id,
        currentWeek: Number(firstFilledWeek[0]),
      }));
      return;
    }
  }
}, [data.weeks, data.currentMajor, data.currentWeek]);

useEffect(() => {
  const init = async () => {
    await loadAllItems();
    await loadAppConfig();
    await autoLockExpiredMatches();
    await loadMatches();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const user = session.user;
      setUserId(user.id);
      setUserEmail(user.email || "");
      setIsAdmin(ADMIN_USER_IDS.includes(user.id));
      await ensureProfile(user.id, user.email || "");
await loadRemoteUserGameState(user.id);
await loadUserBets(user.id);
await loadMyGroups(user.id);
await loadFriends(user.id);
await loadFriendRequests(user.id);
await loadChatList(user.id);
    }

    setMounted(true);
  };

  init();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      const user = session.user;
      setUserId(user.id);
      setUserEmail(user.email || "");
      setIsAdmin(ADMIN_USER_IDS.includes(user.id));
      await ensureProfile(user.id, user.email || "");
await loadRemoteUserGameState(user.id);
await loadUserBets(user.id);
await loadMyGroups(user.id);
await loadFriends(user.id);
await loadFriendRequests(user.id);
await loadChatList(user.id);
    } else {
      setUserId("");
      setUserEmail("");
      setProfileName("");
      setNeedsUsername(false);
      setIsAdmin(false);
      setMyGroups([]);
      setActiveGroupId("");
      setMembers([]);
      setMemberInventories([]);
      setSelectedMember(null);
      setChallengeTargetItem(null);
      setChallengeTargetUser(null);
      setShowChallengePicker(false);
      setIncomingChallenges([]);
      setOutgoingChallenges([]);
      setAllChallenges([]);
      setSelectedChallenge(null);
      setData((prev) => ({
        ...prev,
        picks: {},
        resolvedMatchIds: [],
        tokens: 0,
        inventory: [],
        spinHistory: [],
        bets: [],
      }));
      setDisplayName("");
setAvatarUrl("");
setFriendSearch("");
setFriendSearchResults([]);
setFriends([]);
setFriendRequests([]);
setActiveChat(null);
setChatMessages([]);
setChatInput("");
setChatOpen(false);
setProfileOpen(false);
setProfileTab("profile");
    }
  });

  return () => subscription.unsubscribe();
}, []);

  useEffect(() => {
  const channel = supabase
    .channel("cop-global-live")

    

    .on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "app_config",
  },
  async () => {
    await loadAppConfig();
    await autoLockExpiredMatches();
    await loadMatches();
  }
)

    .on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "matches",
  },
  async () => {
    await autoLockExpiredMatches();
    await loadMatches();
  }
)

    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
useEffect(() => {
  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
}, []);

useEffect(() => {
  if (!userId) {
    setMembers([]);
    setMemberInventories([]);
    return;
  }

  if (activeGroupId) {
    loadGroupDetails(activeGroupId);
    loadGroupPredictions(activeGroupId);
  }

  loadChallenges(userId);
}, [activeGroupId, userId]);
useEffect(() => {
  if (!activeChat?.id || !chatOpen) return;

  const channel = supabase
    .channel(`direct-chat-${activeChat.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "direct_messages",
        filter: `chat_id=eq.${activeChat.id}`,
      },
      async () => {
        await loadMessages(activeChat.id);
      }
    )
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await loadMessages(activeChat.id);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [activeChat?.id, chatOpen]);

useEffect(() => {
  if (!userId) {
    setMembers([]);
    setMemberInventories([]);
    return;
  }

  if (activeGroupId) {
    loadGroupDetails(activeGroupId);
  }

  loadChallenges(userId);
}, [activeGroupId, userId]);

  
useEffect(() => {
  if (!userId) return;

  const interval = setInterval(async () => {
    await loadChallenges(userId);

    if (activeGroupId) {
      await loadGroupDetails(activeGroupId);
    }
  }, 1500);

  return () => clearInterval(interval);
}, [userId, activeGroupId]);
useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`cop-live-${userId}`)
      
.on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "firstshot_challenges",
    filter: `from_user_id=eq.${userId}`,
  },
  async () => {
    await loadChallenges(userId);
    if (activeGroupId) {
      await loadGroupDetails(activeGroupId);
    }
  }
)
.on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "firstshot_challenges",
    filter: `to_user_id=eq.${userId}`,
  },
  async () => {
    await loadChallenges(userId);
    if (activeGroupId) {
      await loadGroupDetails(activeGroupId);
    }
  }
)
      .on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "group_match_predictions",
  },
  async () => {
    if (activeGroupId) {
      await loadGroupPredictions(activeGroupId);
    }
  }
)
.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_items",
        },
        async () => {
          if (activeGroupId) {
            await loadGroupDetails(activeGroupId);
          }
          await loadRemoteUserGameState(userId);
        }
      )
      
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_picks",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await loadRemoteUserGameState(userId);
        }
      )
      
      .on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "match_rewards",
    filter: `user_id=eq.${userId}`,
  },
  async () => {
    await loadRemoteUserGameState(userId);
  }
)
.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "spin_history",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await loadRemoteUserGameState(userId);
        }
      )
      .subscribe((status) => {
  console.log("FIRSTSHOT REALTIME STATUS:", status);
});

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeGroupId]);

  const signInWithGoogle = async () => {
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) setMessage(error.message);
  };

  const signOut = async () => {
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }

    setUserId("");
    setUserEmail("");
    setProfileName("");
    setNeedsUsername(false);
    setIsAdmin(false);
    setMyGroups([]);
    setActiveGroupId("");
    setMembers([]);
    setMemberInventories([]);
    setSelectedMember(null);
    setChallengeTargetItem(null);
    setChallengeTargetUser(null);
    setShowChallengePicker(false);
    setIncomingChallenges([]);
    setOutgoingChallenges([]);
    setAllChallenges([]);
    setSelectedChallenge(null);
    setDisplayName("");
setAvatarUrl("");
setFriendSearch("");
setFriendSearchResults([]);
setFriends([]);
setFriendRequests([]);
setActiveChat(null);
setChatMessages([]);
setChatInput("");
setChatOpen(false);
setProfileOpen(false);
setProfileTab("profile");
setChatList([]);
  };

  const saveDisplayName = async () => {
    setMessage("");
    if (!userId || !profileName.trim()) return;

    const { error } = await supabase
      .from("profiles")
      .update({ username: profileName.trim() })
      .eq("id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setNeedsUsername(false);
    setMessage("Anzeigename gespeichert.");

    await loadMyGroups(userId);
    if (activeGroupId) await loadGroupDetails(activeGroupId);
  };

  const createGroup = async () => {
  console.log("USER ID:", userId);
  setMessage("");

  if (!userId) {
    setMessage("Du musst eingeloggt sein.");
    return;
  }

  if (!groupName.trim()) {
    setMessage("Bitte gib einen Gruppennamen ein.");
    return;
  }

  const inviteCode = generateInviteCode().toUpperCase();

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({
      name: groupName.trim(),
      invite_code: inviteCode,
      owner_id: userId,
    })
    .select()
    .single();

  if (groupError || !group) {
    setMessage(`Gruppenfehler: ${groupError?.message || "Gruppe konnte nicht erstellt werden."}`);
    return;
  }

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({
      group_id: group.id,
      user_id: userId,
    });

  if (memberError) {
    await supabase.from("groups").delete().eq("id", group.id);
    setMessage(`Mitgliedsfehler: ${memberError.message}`);
    return;
  }

  setGroupName("");
  setMessage(`Gruppe erstellt. Code: ${inviteCode}`);
  await loadMyGroups(userId);
  setActiveGroupId(group.id);
};

  const joinGroup = async () => {
  setMessage("");

  if (!userId) {
    setMessage("Du musst eingeloggt sein.");
    return;
  }

  const cleanCode = joinCode.trim().toUpperCase();

  if (!cleanCode) {
    setMessage("Bitte gib einen Code ein.");
    return;
  }

  
  console.log("JOIN CODE:", cleanCode);
  console.log("ITEMS FROM DB:", data);
  console.log("USER ID:", userId);

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name, invite_code, owner_id")
    .eq("invite_code", cleanCode)
    .maybeSingle();

  console.log("GROUP RESULT:", group, groupError);

  if (groupError) {
    setMessage(`Gruppenfehler: ${groupError.message}`);
    return;
  }

  if (!group) {
    setMessage("Gruppe nicht gefunden.");
    return;
  }

  const { data: upsertData, error: memberError } = await supabase
    .from("group_members")
    .upsert(
      {
        group_id: group.id,
        user_id: userId,
      },
      {
        onConflict: "group_id,user_id",
        ignoreDuplicates: true,
      }
    )
    .select();

  console.log("MEMBER UPSERT:", upsertData, memberError);

  if (memberError) {
    setMessage(`Beitrittsfehler: ${memberError.message}`);
    return;
  }

  setJoinCode("");
  setMessage(`Du bist ${group.name} beigetreten.`);
  await loadMyGroups(userId);
  setActiveGroupId(group.id);
};

  const copyInviteCode = async () => {
    if (!activeGroup?.invite_code) return;
    try {
      await navigator.clipboard.writeText(activeGroup.invite_code);
      setMessage("Code kopiert.");
    } catch {
      setMessage(activeGroup.invite_code);
    }
  };

  const leaveGroup = async () => {
    setMessage("");
    if (!userId || !activeGroup) return;
    if (activeGroup.owner_id === userId) {
      return setMessage("Als Besitzer musst du die Gruppe löschen.");
    }

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", activeGroup.id)
      .eq("user_id", userId);

    if (error) return setMessage(error.message);

    setMessage("Gruppe verlassen.");
    await loadMyGroups(userId);
    setSelectedMember(null);
  };

  const deleteGroup = async () => {
    setMessage("");
    if (!userId || !activeGroup) return;
    if (activeGroup.owner_id !== userId) {
      return setMessage("Nur der Gruppenbesitzer kann die Gruppe löschen.");
    }
    if (!confirm(`Willst du die Gruppe "${activeGroup.name}" wirklich löschen?`)) return;

    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", activeGroup.id)
      .eq("owner_id", userId);

    if (error) return setMessage(error.message);

    setMessage("Gruppe gelöscht.");
    await loadMyGroups(userId);
    setSelectedMember(null);
  };

  const removeMemberFromGroup = async (targetUserId: string) => {
    setMessage("");
    if (!userId || !activeGroup) return;
    if (activeGroup.owner_id !== userId) {
      return setMessage("Nur der Besitzer kann Mitglieder entfernen.");
    }
    if (targetUserId === userId) return setMessage("Du kannst dich nicht selbst entfernen.");

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", activeGroup.id)
      .eq("user_id", targetUserId);

    if (error) return setMessage(error.message);

    setMessage("Mitglied entfernt.");
    await loadGroupDetails(activeGroup.id);
    if (selectedMember?.user_id === targetUserId) setSelectedMember(null);
  };

  const createFirstshotChallenge = async (myItem: MemberInventoryItem) => {
    setMessage("");

    if (!userId || !challengeTargetItem || !challengeTargetUser) {
      setMessage("Challenge-Daten fehlen.");
      return;
    }

    if (challengeTargetUser.user_id === userId) {
      setMessage("Du kannst dich nicht selbst herausfordern.");
      return;
    }

    if (myItem.inventory_id === challengeTargetItem.inventory_id) {
      setMessage("Du kannst nicht dasselbe Item wählen.");
      return;
    }

    if (
      isInventoryItemLocked(myItem.inventory_id) ||
      isInventoryItemLocked(challengeTargetItem.inventory_id)
    ) {
      setMessage("Mindestens eines der Items ist bereits in einer aktiven Challenge.");
      return;
    }

    const { error } = await supabase.from("firstshot_challenges").insert({
      from_user_id: userId,
      to_user_id: challengeTargetUser.user_id,
      requested_inventory_item_id: challengeTargetItem.inventory_id,
      offered_inventory_item_id: myItem.inventory_id,
      status: "pending",
      winner_user_id: null,
      first_player_id: null,
      second_player_id: null,
      first_player_time: null,
      second_player_time: null,
      first_player_false_start: false,
      second_player_false_start: false,
      is_draw: false,
    });

    if (error) {
      setMessage(error.message);
      return;
    }
setShowChallengePicker(false);
setChallengeTargetItem(null);
setChallengeTargetUser(null);
setSelectedMember(null);
setMessage("FirstShot-Challenge gesendet.");
await loadChallenges(userId);
if (activeGroupId) {
  await loadGroupDetails(activeGroupId);
}
if (activeGroupId) {
  await loadGroupDetails(activeGroupId);
}
    setShowChallengePicker(false);
    setChallengeTargetItem(null);
    setChallengeTargetUser(null);
    setSelectedMember(null);
    setMessage("FirstShot-Challenge gesendet.");
    await loadChallenges(userId);
  };

  const acceptChallenge = async (challengeId: string) => {
  setMessage("");

  const challenge = allChallenges.find((c) => c.id === challengeId);
  if (!challenge) {
    setMessage("Challenge nicht gefunden.");
    return;
  }

  const { error } = await supabase
    .from("firstshot_challenges")
    .update({
      status: "accepted",
      first_player_id: challenge.to_user_id,
      second_player_id: challenge.from_user_id,
      first_player_time: null,
      second_player_time: null,
      first_player_false_start: false,
      second_player_false_start: false,
      winner_user_id: null,
      is_draw: false,
    })
    .eq("id", challengeId);

  if (error) {
    setMessage(error.message);
    return;
  }

  setMessage("Challenge angenommen. Du spielst zuerst.");

  // 🔥 HIER EINFÜGEN
  setSelectedChallenge((prev) =>
    prev && prev.id === challengeId
      ? {
          ...prev,
          status: "accepted",
          first_player_id: challenge.to_user_id,
          second_player_id: challenge.from_user_id,
          first_player_time: null,
          second_player_time: null,
          first_player_false_start: false,
          second_player_false_start: false,
          winner_user_id: null,
          is_draw: false,
        }
      : prev
  );

  await loadChallenges(userId);

  if (activeGroupId) {
    await loadGroupDetails(activeGroupId);
  }
};

  const declineChallenge = async (challengeId: string) => {
    setMessage("");

    const { error } = await supabase
      .from("firstshot_challenges")
      .update({ status: "declined" })
      .eq("id", challengeId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Challenge abgelehnt.");
await loadChallenges(userId);
if (activeGroupId) {
  await loadGroupDetails(activeGroupId);
}
  };

  const getNextFirstshotDelay = () => {
  return 300 + Math.floor(Math.random() * 2201); // 300ms bis 2500ms
};

const scheduleNextFirstshotSignal = (nextRoundIndex: number) => {
  const delay = getNextFirstshotDelay();

  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }

  setRoundUi("waiting");
  setRoundFeedback(`Warte auf Signal ${nextRoundIndex + 1}/6`);

  timeoutRef.current = setTimeout(() => {
    setFirstshotRound((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        roundIndex: nextRoundIndex,
        signalAt: Date.now(),
        clicked: false,
      };
    });

    setRoundUi("live");
    setRoundFeedback(`JETZT! ${nextRoundIndex + 1}/6`);
  }, delay);
};
const openChallengeModal = (challenge: ChallengeType) => {
    setSelectedChallenge(challenge);
    setRoundFeedback("");
    setFirstshotRound(null);

    if (challenge.status === "pending") {
      setRoundUi("pending");
      return;
    }

    if (challenge.status === "declined" || challenge.status === "finished") {
      setRoundUi("finished");
      return;
    }

    if (challenge.status === "accepted") {
      if (challenge.first_player_id === userId && challenge.first_player_time == null) {
        setRoundUi("ready");
      } else {
        setRoundUi("watch");
      }
      return;
    }

    if (challenge.status === "second_turn") {
      if (challenge.second_player_id === userId && challenge.second_player_time == null) {
        setRoundUi("ready");
      } else {
        setRoundUi("saved");
      }
      return;
    }

    setRoundUi("idle");
  };

  const closeChallengeModal = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setFirstshotRound(null);
    setSelectedChallenge(null);
    setRoundFeedback("");
    setRoundUi("idle");
  };

  const beginFirstshotRound = (challenge: ChallengeType) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const canPlayFirst =
      challenge.status === "accepted" &&
      challenge.first_player_id === userId &&
      challenge.first_player_time == null;

    const canPlaySecond =
      challenge.status === "second_turn" &&
      challenge.second_player_id === userId &&
      challenge.second_player_time == null;

    if (!canPlayFirst && !canPlaySecond) {
      setMessage("Du bist gerade nicht an der Reihe.");
      return;
    }

    setFirstshotRound({
  challengeId: challenge.id,
  roundIndex: 0,
  signalAt: null,
  clicked: false,
  times: [],
  finished: false,
});

scheduleNextFirstshotSignal(0);
  };

  const submitReaction = async () => {
  const challenge = selectedChallengeFresh;
  const round = firstshotRound;

  if (!challenge || !round || round.clicked) return;

  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }

  const signalAt = round.signalAt;
  const falseStart = signalAt == null;
  const reactionTime = falseStart ? 999999 : Date.now() - signalAt;

  const nextTimes = [...round.times, reactionTime];
  const isLastShot = round.roundIndex >= 5;

  setFirstshotRound((prev) =>
    prev
      ? {
          ...prev,
          clicked: true,
          signalAt: null,
          times: nextTimes,
          finished: isLastShot,
        }
      : prev
  );

  if (!isLastShot) {
    setRoundFeedback(
      falseStart
        ? `Fehlstart bei Schuss ${round.roundIndex + 1}/6.`
        : `Schuss ${round.roundIndex + 1}/6: ${reactionTime} ms`
    );

    scheduleNextFirstshotSignal(round.roundIndex + 1);
    return;
  }

  const totalTime = nextTimes.reduce((sum, value) => sum + value, 0);

  try {
    if (
      challenge.status === "accepted" &&
      challenge.first_player_id === userId &&
      challenge.first_player_time == null
    ) {
      const { error } = await supabase
        .from("firstshot_challenges")
        .update({
          first_player_time: totalTime,
          first_player_false_start: nextTimes.includes(999999),
          status: "second_turn",
        })
        .eq("id", challenge.id);

      if (error) throw error;

      setRoundUi("saved");
      setRoundFeedback(
        `Deine Gesamtzeit wurde gespeichert (${totalTime} ms). Jetzt ist der Gegner dran.`
      );
    } else if (
      challenge.status === "second_turn" &&
      challenge.second_player_id === userId &&
      challenge.second_player_time == null
    ) {
      const { error } = await supabase
        .from("firstshot_challenges")
        .update({
          second_player_time: totalTime,
          second_player_false_start: nextTimes.includes(999999),
        })
        .eq("id", challenge.id);

      if (error) throw error;

      const { data: refreshed, error: refreshError } = await supabase
        .from("firstshot_challenges")
        .select("*")
        .eq("id", challenge.id)
        .single();

      if (refreshError || !refreshed) {
        throw new Error(
          refreshError?.message || "Challenge konnte nicht neu geladen werden."
        );
      }

      const refreshedChallenge = refreshed as ChallengeType;
      const firstTime = refreshedChallenge.first_player_time ?? 999999;
      const secondTime = refreshedChallenge.second_player_time ?? 999999;

      if (firstTime === secondTime) {
        const { error: drawError } = await supabase
          .from("firstshot_challenges")
          .update({
            status: "finished",
            winner_user_id: null,
            is_draw: true,
          })
          .eq("id", challenge.id);

        if (drawError) throw drawError;

        setRoundFeedback("Unentschieden. Beide behalten ihre Items.");
      } else {
        const winnerId =
  firstTime < secondTime
    ? refreshedChallenge.first_player_id
    : refreshedChallenge.second_player_id;

if (!winnerId) {
  throw new Error("Gewinner konnte nicht bestimmt werden.");
}

const loserId =
  winnerId === refreshedChallenge.from_user_id
    ? refreshedChallenge.to_user_id
    : refreshedChallenge.from_user_id;

const losingItemId =
  winnerId === refreshedChallenge.from_user_id
    ? refreshedChallenge.requested_inventory_item_id
    : refreshedChallenge.offered_inventory_item_id;

const { error: transferError } = await supabase
  .from("inventory_items")
  .update({ owner_id: winnerId })
  .eq("id", losingItemId);

if (transferError) {
  const transferMessage =
    transferError instanceof Error
      ? transferError.message
      : String((transferError as any)?.message || transferError);

  throw new Error(`Item-Transfer fehlgeschlagen: ${transferMessage}`);
}

await supabase.from("inventory_item_history").insert({
  inventory_item_id: losingItemId,
  owner_id: winnerId,
  action: "transferred",
  source_user_id: loserId,
  note: "FirstShot gewonnen",
});

        
        const { error: finishError } = await supabase
          .from("firstshot_challenges")
          .update({
            status: "finished",
            winner_user_id: winnerId,
            is_draw: false,
          })
          .eq("id", challenge.id);

        if (finishError) throw finishError;

        setRoundFeedback(`Deine Gesamtzeit: ${totalTime} ms. Ergebnis wurde ausgewertet.`);
      }

      await loadChallenges(userId);
      if (activeGroupId) await loadGroupDetails(activeGroupId);
      await loadRemoteUserGameState(userId);
      setRoundUi("finished");
    }

    await loadChallenges(userId);
    if (activeGroupId) await loadGroupDetails(activeGroupId);
  } catch (error: any) {
    setMessage(error.message || "FirstShot konnte nicht gespeichert werden.");
  } finally {
    setFirstshotRound(null);
  }
};

  const getChallengeStatusLabel = (status: string) => {
    if (status === "pending") return "Wartet auf Annahme";
    if (status === "accepted") return "Erster Spieler dran";
    if (status === "second_turn") return "Zweiter Spieler dran";
    if (status === "finished") return "Abgeschlossen";
    if (status === "declined") return "Abgelehnt";
    return status;
  };

  const activeFirstshotChallenges = allChallenges.filter(
  (challenge) => challenge.status !== "finished" && challenge.status !== "declined"
);

const pastFirstshotChallenges = allChallenges.filter(
  (challenge) => challenge.status === "finished" || challenge.status === "declined"
);


const getGroupPredictionPoints = (
  match: MatchType,
  prediction?: GroupPredictionType
) => {
  if (!prediction) return 0;
  if (!hasSavedScore(match)) return 0;

  const actualA = Number(match.scoreA);
  const actualB = Number(match.scoreB);
  const predA = prediction.predicted_score_a;
  const predB = prediction.predicted_score_b;

  if (actualA === predA && actualB === predB) return 3;

  const actualWinner =
    actualA > actualB ? "A" : actualB > actualA ? "B" : "draw";

  const predictedWinner =
    predA > predB ? "A" : predB > predA ? "B" : "draw";

  if (actualWinner === predictedWinner) return 2;

  return 0;
};

const getUsersWhoPredictedMatch = (matchId: string) => {
  return groupPredictions.filter((row) => row.match_id === matchId);
};

const getMyGroupPrediction = (matchId: string) => {
  return groupPredictions.find(
    (row) => row.match_id === matchId && row.user_id === userId
  );
};

const activeGroupPickemMatches = useMemo(() => {
  return allMatchesFlat.filter((match) => !hasSavedScore(match));
}, [allMatchesFlat]);

const evaluatedGroupPickemMatches = useMemo(() => {
  return allMatchesFlat.filter((match) => {
    if (!hasSavedScore(match)) return false;
    return groupPredictions.some((row) => row.match_id === match.id);
  });
}, [allMatchesFlat, groupPredictions]);

const betKingRows = useMemo(() => {
  if (!activeGroupId) return [];

  return members
    .map((member) => {
      const memberPredictions = groupPredictions.filter(
        (row) => row.user_id === member.user_id
      );

      const points = allMatchesFlat.reduce((sum, match) => {
        const prediction = memberPredictions.find((p) => p.match_id === match.id);
        return sum + getGroupPredictionPoints(match, prediction);
      }, 0);

      return {
        ...member,
        betKingPoints: points,
      };
    })
    .sort((a, b) => b.betKingPoints - a.betKingPoints);
}, [members, groupPredictions, allMatchesFlat, activeGroupId]);

const findMajorAndWeekLabelForMatch = (matchId: string) => {
  for (const major of majorStructure) {
    const weekMap = data.weeks[major.id] || {};

    for (const [weekKey, list] of Object.entries(weekMap)) {
      const found = (list || []).find((m) => m.id === matchId);

      if (found) {
        return `${major.label} · ${getDisplayWeek(Number(weekKey))}`;
      }
    }
  }

  return "Unbekannt";
};



if (!mounted) {
  return <div className="min-h-screen bg-black" />;
}

  return (
    <div className="min-h-screen bg-black text-white">
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.04);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.45);
          border-radius: 999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.7);
        }
      `}</style>

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-gradient-to-b from-zinc-950 via-black to-zinc-950 md:max-w-5xl xl:max-w-7xl 2xl:max-w-[1600px]">
        <div className="border-b border-white/10 px-5 pb-4 pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-violet-300/80">
                Call of Duty
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight">PickStar</h1>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
              {data.tokens} Tokens
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-40 pt-4">
          <AnimatePresence mode="wait">
            {screen === "home" && (
  <motion.div
    key="home"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="mx-auto w-full max-w-md space-y-4 md:max-w-5xl xl:max-w-7xl 2xl:max-w-[1600px]"
  >
    
                {!userEmail ? (
                  <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-5 shadow-xl">
                    <div className="text-sm text-zinc-400">Online Funktionen</div>
                    <div className="mt-1 text-2xl font-black">Melde dich mit Google an</div>
                    <div className="mt-2 text-sm text-zinc-400">
                      Dann werden Picks, Tokens, Inventar, Spins und Gruppen online gespeichert.
                    </div>
                    <Button
                      onClick={signInWithGoogle}
                      className="mt-4 flex w-full items-center justify-center gap-2"
                    >
                      <LogIn className="h-4 w-4" />
                      Mit Google anmelden
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-4">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={profileName || userEmail || "Profilbild"}
          className="h-16 w-16 rounded-full border border-white/10 object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-black uppercase text-white">
          {(profileName || userEmail || "U").charAt(0)}
        </div>
      )}

      <div>
        <div className="text-sm text-zinc-400">Online verbunden</div>
        <div className="font-bold">{profileName || userEmail}</div>
        <div className="text-xs text-zinc-500">{userEmail}</div>
      </div>
    </div>

    <Button
      onClick={signOut}
      variant="ghost"
      className="flex items-center gap-2 px-3 py-2"
    >
      <LogOut className="h-4 w-4" />
      Logout
    </Button>
  </div>
</div>
                )}

                <div className="mx-auto w-full max-w-md md:max-w-5xl xl:max-w-7xl 2xl:max-w-[1600px] px-4">
  <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 shadow-[0_0_40px_rgba(168,85,247,0.25)]">
    
    {/* Glow Effekt */}
    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 pointer-events-none" />

    <img
      src="/hintergrund/banneroben.png"
      alt="PickStar Banneroben"
      className="w-full h-auto object-cover"
    />
  </div>
</div>
                
                <div className="relative overflow-hidden rounded-[30px] border border-violet-500/20 bg-[linear-gradient(135deg,rgba(91,33,182,0.32),rgba(217,70,239,0.10),rgba(6,182,212,0.12))] p-5 shadow-[0_20px_80px_rgba(76,29,149,0.28)]">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-400/20 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-8 left-10 h-24 w-24 rounded-full bg-cyan-400/20 blur-3xl" />

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.3em] text-violet-300">
                        {data.stageLabel}
                      </div>
                      <div className="mt-2 text-2xl font-black leading-tight">
                        Tippe Matches, verdiene Tokens und jage seltene Items.
                      </div>
                    </div>

                    <Trophy className="mt-1 h-6 w-6 text-violet-200" />
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Button
  onClick={() => setScreen("picks")}
  className="flex flex-1 items-center justify-center gap-2"
>
  Jetzt tippen <ChevronRight className="h-4 w-4" />
</Button>

<Button
  onClick={() => setScreen("slot")}
  variant="ghost"
  className="flex-1 border-white/15 bg-white/10"
>
  Slot öffnen
</Button>
                  </div>
                </div>

                <div className="mx-auto w-full max-w-md md:max-w-5xl xl:max-w-7xl 2xl:max-w-[1600px] px-4">
  <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 shadow-[0_0_40px_rgba(168,85,247,0.25)]">
    
    {/* Glow Effekt */}
    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 pointer-events-none" />

    <img
      src="/hintergrund/bannercasino.png"
      alt="PickStar Banner"
      className="w-full h-auto object-cover"
    />
  </div>
</div>

                

                <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
  <div className="mb-4 flex items-center justify-between gap-3">
    <div>
      <div className="text-lg font-black">
        {showCompletedHomeMatches ? "Beendete Matches" : "Anstehende Matches"}
      </div>
      <div className="text-sm text-zinc-400">
        {currentMajor.label} · {getDisplayWeek(currentWeek)}
      </div>
    </div>

    <button
      type="button"
      onClick={() => setShowCompletedHomeMatches((prev) => !prev)}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        showCompletedHomeMatches
          ? "bg-emerald-500 text-black"
          : "bg-white/5 text-zinc-300"
      }`}
    >
      {showCompletedHomeMatches ? "Beendet" : "Anstehend"}
    </button>
  </div>

  <div className="space-y-3">
    {(showCompletedHomeMatches ? completedHomeMatches : upcomingHomeMatches).length > 0 ? (
      (showCompletedHomeMatches ? completedHomeMatches : upcomingHomeMatches).map((match) => (
        <div
          key={match.id}
          className="flex items-center justify-between rounded-2xl bg-black/40 px-3 py-3"
        >
          <div className="flex items-center gap-3">
            <TeamMini name={match.teamA} />
            <span>{match.teamA}</span>
            <span className="text-zinc-500">vs</span>
            <TeamMini name={match.teamB} />
            <span>{match.teamB}</span>
          </div>

          {hasSavedScore(match) ? (
            <div className="text-right">
              <div className="text-base font-black">
                {match.scoreA} : {match.scoreB}
              </div>
              <div className="text-xs text-zinc-400">{match.startsAt}</div>
            </div>
          ) : (
            <span className="text-zinc-400">{match.startsAt}</span>
          )}
        </div>
      ))
    ) : (
      <div className="rounded-2xl bg-black/40 px-3 py-3 text-sm text-zinc-400">
        {showCompletedHomeMatches
          ? "Keine beendeten Matches in dieser Woche."
          : "Keine anstehenden Matches in dieser Woche."}
      </div>
    )}
  </div>
</div>
<HomeMediaPlayer />
              </motion.div>
            )}

            {screen === "picks" && (
              <motion.div
                key="picks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-auto w-full max-w-md space-y-4 md:max-w-5xl xl:max-w-7xl 2xl:max-w-[1600px]"
              >
                <SectionTitle
                  eyebrow={`${currentMajor.label} · Woche ${getDisplayWeek(currentWeek)}`}
                  title="Deine Picks"
                  right={
                    <div className="text-sm text-zinc-400">
                      {totalPicked}/{matches.length} gewählt
                    </div>
                  }
                />
<div className="flex gap-2 overflow-x-auto pb-1">
  {majorStructure.map((major) => (
    <button
      key={major.id}
      onClick={() => changeMajor(major.id)}
      className={`rounded-xl px-3 py-2 text-sm font-semibold ${
        major.id === data.currentMajor
          ? "bg-violet-500 text-white"
          : "bg-white/5 text-zinc-300"
      }`}
    >
      {major.label}
    </button>
  ))}
</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {visibleWeeks.map((week) => (
  <button
    key={week.id}
    onClick={() => changeWeek(week.id)}
    className={`rounded-xl px-3 py-2 text-sm font-semibold ${
      week.id === currentWeek
        ? "bg-violet-500 text-white"
        : "bg-white/5 text-zinc-300"
    }`}
  >
    {week.label}
  </button>
))}
                </div>

                {matches.map((match) => {
  const selected = data.picks[String(match.id)];
  const lockedNow = isMatchLocked(match);

  return (
    <div
      key={match.id}
      className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-zinc-400">{match.startsAt}</div>
        {lockedNow ? (
          <div className="flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-200">
            <Lock className="h-3 w-3" />
            Gesperrt
          </div>
        ) : (
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
            Offen
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => !lockedNow && setPick(match.id, "A")}
          className={`rounded-2xl border p-4 text-left transition ${
            selected === "A"
              ? "border-violet-400 bg-violet-500/20"
              : "border-white/10 bg-black/40"
          } ${lockedNow ? "opacity-50" : "hover:border-violet-400/60"}`}
        >
          <div className="text-xs text-zinc-400">Team A</div>
          <div className="mt-1 flex items-center gap-2 text-lg font-bold">
            <TeamMini name={match.teamA} />
            <span>{match.teamA}</span>
          </div>
        </button>

        <button
          onClick={() => !lockedNow && setPick(match.id, "B")}
          className={`rounded-2xl border p-4 text-left transition ${
            selected === "B"
              ? "border-cyan-400 bg-cyan-500/20"
              : "border-white/10 bg-black/40"
          } ${lockedNow ? "opacity-50" : "hover:border-cyan-400/60"}`}
        >
          <div className="text-xs text-zinc-400">Team B</div>
          <div className="mt-1 flex items-center gap-2 text-lg font-bold">
            <TeamMini name={match.teamB} />
            <span>{match.teamB}</span>
          </div>
        </button>
      </div>
    </div>
  );
})}

                {!matches.length && (
                  <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-6 text-center text-zinc-400 shadow-xl">
                    Diese Woche hat noch keine Matches.
                  </div>
                )}

                <Button
  onClick={resolveWeek}
  disabled={!hasPendingRewards}
  className="w-full"
>
  {hasPendingRewards
    ? `Gesperrte Matches auswerten (${pendingRewardMatches.length})`
    : "Keine gesperrten Matches zur Auswertung"}
</Button>

<div className="grid grid-cols-2 gap-3">
  <Button
    onClick={() => setShowBetBuilder(true)}
    variant="violet"
    className="w-full"
  >
    Jetzt wetten!
  </Button>

  <Button
    onClick={() => setShowMyBets(true)}
    variant="ghost"
    className="w-full"
  >
    Meine Wettscheine
  </Button>
</div>
              </motion.div>
            )}

            {screen === "slot" && (
              <motion.div
                key="slot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-auto w-full space-y-4 max-w-md md:max-w-3xl xl:max-w-5xl"
              >
                <SectionTitle eyebrow="Slotmachine" title="Dreh für 1 Token" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
  <Button
    onClick={() => {
      setSlotViewMode("classic");
      setLastMultiLineWinningIndexes([]);
      setRiskGiftRarity(null);
    }}
    variant={slotViewMode === "classic" ? "violet" : "ghost"}
    className="w-full"
  >
    Normal / 3x3
  </Button>

  <Button
    onClick={() => {
      setSlotViewMode("multiline");
      setLastMultiLineWinningIndexes([]);
      setRiskGiftRarity(null);
    }}
    variant={slotViewMode === "multiline" ? "violet" : "ghost"}
    className="w-full"
  >
    Multi-Line
  </Button>

  <Button
    onClick={() => {
      setSlotViewMode("risk");
      setLastMultiLineWinningIndexes([]);
    }}
    variant={slotViewMode === "risk" ? "violet" : "ghost"}
    className="w-full"
  >
    Alles Spitze
  </Button>
</div>

                <div className="relative overflow-hidden rounded-[34px] border border-amber-300/30 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_20%),linear-gradient(180deg,#2a190f_0%,#130d09_20%,#050505_100%)] p-3 shadow-[0_0_120px_rgba(168,85,247,0.22),0_0_60px_rgba(251,191,36,0.14)]">
                  <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-violet-500/18 blur-3xl" />
                  <div className="pointer-events-none absolute -right-12 bottom-8 h-40 w-40 rounded-full bg-fuchsia-500/16 blur-3xl" />
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-20 bg-gradient-to-b from-amber-200/10 to-transparent blur-2xl" />

                  <div className="relative z-10 mb-4 flex items-center justify-between rounded-[24px] border border-white/10 bg-black/30 px-4 py-3 backdrop-blur">
  <div>
    <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-200/80">
      {slotViewMode === "classic"
        ? "Classic Slot"
        : slotViewMode === "multiline"
          ? "Multi-Line Slot"
          : "Risk Game"}
    </div>

    <div className="mt-1 text-lg font-black text-white">
      {slotViewMode === "classic"
        ? "Gewinne Items"
        : slotViewMode === "multiline"
          ? "Gewinne Token"
          : "Gewinne Token und Items"}
    </div>
  </div>

  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-right">
    <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/70">
      Tokens
    </div>
    <div className="text-lg font-black text-amber-200">{data.tokens}</div>
  </div>
</div>

                 {slotViewMode !== "multiline" && (
  <div className="relative z-10 mb-4 rounded-[24px] border border-white/10 bg-black/30 p-4 backdrop-blur">
    <div className="mb-3 text-sm font-bold text-zinc-300">
      {slotViewMode === "risk" ? "Risk Einsatz" : "Einsatz wählen"}
    </div>

    <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
      {SLOT_STAKES.map((stake) => {
        const active = slotStake === stake;
        const bonus = SLOT_BONUS_CHANCE[stake] * 100;

        return (
          <button
            key={stake}
            type="button"
            onClick={() => setSlotStake(stake)}
            className={`rounded-2xl border px-3 py-3 text-sm transition ${
              active
                ? "border-violet-400 bg-violet-500/20 text-white"
                : "border-white/10 bg-black/40 text-zinc-300"
            }`}
          >
            <div className="font-black">{stake}</div>
            <div className="text-xs text-zinc-400">
              {slotViewMode === "risk" ? "pro Run" : `+${bonus}%`}
            </div>
          </button>
        );
      })}
    </div>

    {slotViewMode === "classic" && (
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
        <div>
          <div className="text-sm font-bold text-zinc-200">Multi-Slots</div>
          <div className="text-xs text-zinc-400">
            3x3 Layout · bis zu 3 Treffer pro Spin
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMultiSlotMode((prev) => !prev)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            multiSlotMode
              ? "bg-emerald-500 text-black"
              : "bg-white/5 text-zinc-300"
          }`}
        >
          {multiSlotMode ? "Aktiv" : "Aus"}
        </button>
      </div>
    )}
  </div>
)}

{slotViewMode === "multiline" && (
  <div className="relative z-10 mb-4 rounded-[24px] border border-white/10 bg-black/30 p-4 backdrop-blur">
    <div className="mb-3 text-sm font-bold text-zinc-300">Multi-Line Einsatz</div>

    <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
      {SLOT_STAKES.map((stake) => (
        <button
          key={`multiline-${stake}`}
          type="button"
          onClick={() => setMultiLineStake(stake)}
          className={`rounded-2xl border px-3 py-3 text-sm transition ${
            multiLineStake === stake
              ? "border-violet-400 bg-violet-500/20 text-white"
              : "border-white/10 bg-black/40 text-zinc-300"
          }`}
        >
          <div className="font-black">{stake}</div>
        </button>
      ))}
    </div>

    <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
      <div className="text-sm font-bold text-zinc-200">Multi-Line Modus</div>
      <div className="text-xs text-zinc-400">
        3x3 Grid · 8 Gewinnlinien · Einsatz nur für Multi-Line
      </div>
    </div>
  </div>
)}
{slotViewMode === "multiline" && (
  <div className="mb-4 rounded-[22px] border border-white/10 bg-black/30 px-4 py-4">
    <div className="text-center">
      <div className="text-[11px] uppercase tracking-[0.28em] text-zinc-400">
        Multi-Line Auszahlung
      </div>
      <div className="mt-1 text-sm text-zinc-400">
        8 mögliche Linien · Gewinn = Einsatz × Multiplikator
      </div>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
      {[
        { hits: 1, multi: "0.4x" },
        { hits: 2, multi: "2x" },
        { hits: 3, multi: "10x" },
        { hits: 4, multi: "50x" },
        { hits: 5, multi: "200x" },
        { hits: 6, multi: "1000x" },
        { hits: 8, multi: "20000x" },
      ].map((row) => (
        <div
          key={row.hits}
          className="rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-center"
        >
          <div className="font-black text-white">{row.hits} Treffer</div>
          <div className="text-zinc-400">{row.multi}</div>
        </div>
      ))}
    </div>

    <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-center">
      <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
        Aktueller Einsatz
      </div>
      <div className="mt-1 text-lg font-black text-amber-200">
        {multiLineStake} Tokens
      </div>
    </div>

    {lastMultiLineHitCount > 0 && (
      <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center">
        <div className="text-sm font-bold text-emerald-200">
          Letzter Gewinn
        </div>
        <div className="mt-1 text-lg font-black text-white">
          {lastMultiLineHitCount} Treffer · +{lastMultiLinePayout} Tokens
        </div>
      </div>
    )}
  </div>
)}
<div className="relative z-10 overflow-hidden rounded-[30px] border border-white/10 p-4 shadow-[inset_0_2px_20px_rgba(255,255,255,0.05),inset_0_-20px_30px_rgba(0,0,0,0.35)]">
{/* 🎥 SLOT VIDEO BACKGROUND */}
<video
  key={slotViewMode === "multiline" ? "multiline-bg" : "normal-bg"}
  src={
    slotViewMode === "multiline"
      ? "/effects/multilinehintergrund.webm"
      : "/effects/slothintergrund.webm"
  }
  autoPlay
  loop
  muted
  playsInline
  className="absolute inset-0 h-full w-full object-cover opacity-40"
/>

{/* 🔥 dunkler Overlay */}


{/* 👉 Content Layer */}
<div className="relative z-10"></div>
                    
                    {slotViewMode === "classic" && (
  <div className="relative z-20 mb-3 w-full">
    {firelineRewardNotice && (
      <div className="mb-3 rounded-2xl border border-amber-400/30 bg-amber-500/15 px-4 py-3 text-center text-sm font-bold text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
        {firelineRewardNotice}
      </div>
    )}

    <div
  className={`relative h-6 w-full transition-all duration-200 ${
    firelineFlash
      ? "scale-[1.02] drop-shadow-[0_0_24px_rgba(255,180,0,0.95)]"
      : ""
  }`}
>
      <div className="pointer-events-none absolute inset-0 z-30">
        {([1, 2, 3, 4, 5] as const).map((step) => {
          const percentMap = {
            1: 20,
            2: 40,
            3: 60,
            4: 80,
            5: 100,
          } as const;

          const isLast = step === 5;

          return (
            <div
              key={step}
              className={`absolute top-1/2 -translate-y-1/2 ${
                isLast ? "-translate-x-full" : "-translate-x-1/2"
              }`}
              style={{ left: `${percentMap[step]}%` }}
            >
              <img
                src={`/zeichen/zahl${step}gelb.png`}
                alt={`Stufe ${step}`}
                className={`h-6 w-auto transition-all duration-300 ${
                  firelineProgressValue >= step
                    ? "opacity-100 scale-110 drop-shadow-[0_0_6px_rgba(255,200,0,0.9)]"
                    : "opacity-30 scale-90 grayscale"
                }`}
              />
            </div>
          );
        })}
      </div>

      <div className="relative h-6 w-full overflow-hidden rounded-full border border-white/10 bg-black/40">
        <div
          className="absolute inset-y-0 left-0 overflow-hidden rounded-full transition-all duration-500"
          style={{ width: `${firelinePercent}%` }}
        >
          <video
            src="/effects/fireline.webm"
            autoPlay
            loop
            muted
            playsInline
            className="absolute left-1/2 top-1/2 h-[1400%] w-[120%] -translate-x-1/2 -translate-y-1/2 object-cover"
          />

          <div className="absolute inset-0 shadow-[0_0_25px_rgba(255,120,0,0.6),0_0_40px_rgba(255,60,0,0.5)]" />
        </div>
{firelineFlash && (
  <div className="pointer-events-none absolute inset-0 z-20 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.2),rgba(255,220,120,0.95),rgba(255,255,255,0.2))] animate-pulse shadow-[0_0_30px_rgba(255,200,80,0.95),0_0_60px_rgba(255,140,0,0.7)]" />
)}
        <div className="absolute inset-0 rounded-full ring-1 ring-white/10" />
      </div>
    </div>
  </div>
)}
                    <div className="relative z-10 rounded-[28px] border border-white/10 bg-black/35 p-3 shadow-inner shadow-black/50">
  {slotViewMode === "multiline" ? (
    <div className="relative mx-auto w-fit">
      <div className="grid gap-3">
        {multiLineGrid.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-3 gap-3 justify-items-center md:gap-10 xl:gap-16 2xl:gap-20"
          >
            {row.map((symbol, idx) => (
              <Reel
                key={`multiline-${rowIndex}-${idx}`}
                symbol={symbol}
                spinning={spinning}
                delay={(rowIndex * 3 + idx) * 0.05}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-30">
        {[0, 1, 2].map((row) => {
          const active = lastMultiLineWinningIndexes.includes(row);
          const top = row === 0 ? "16.66%" : row === 1 ? "50%" : "83.33%";

          return (
            <div
              key={`row-line-${row}`}
              className={`absolute left-[4%] right-[4%] h-[2px] -translate-y-1/2 rounded-full transition-all duration-300 ${
                active
                  ? "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.95)]"
                  : "bg-white/10"
              }`}
              style={{ top }}
            />
          );
        })}

        {[0, 1, 2].map((col) => {
          const lineIndex = 3 + col;
          const active = lastMultiLineWinningIndexes.includes(lineIndex);
          const left = col === 0 ? "16.66%" : col === 1 ? "50%" : "83.33%";

          return (
            <div
              key={`col-line-${col}`}
              className={`absolute top-[4%] bottom-[4%] w-[2px] -translate-x-1/2 rounded-full transition-all duration-300 ${
                active
                  ? "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.95)]"
                  : "bg-white/10"
              }`}
              style={{ left }}
            />
          );
        })}

        {[0, 1].map((diag) => {
          const lineIndex = 6 + diag;
          const active = lastMultiLineWinningIndexes.includes(lineIndex);

          return (
            <div
              key={`diag-line-${diag}`}
              className={`absolute left-[8%] top-1/2 h-[2px] w-[84%] -translate-y-1/2 origin-center rounded-full transition-all duration-300 ${
                active
                  ? "bg-fuchsia-300 shadow-[0_0_18px_rgba(244,114,182,0.95)]"
                  : "bg-white/10"
              }`}
              style={{
                transform: `translateY(-50%) rotate(${diag === 0 ? 35 : -35}deg)`,
              }}
            />
          );
        })}
      </div>
    </div>
  ) : slotViewMode === "risk" ? (
    <div className="space-y-4">
      <div className="rounded-3xl border border-red-500/20 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-400">Risk Game</div>
            <div className="text-2xl font-black">Alles Spitze</div>
            <div className="mt-1 text-sm text-zinc-400">
              Drück weiter auf Play für mehr Pot und bessere Rarity. Trifft Zombie Teddy die Mitte, verlierst du alles.
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
  Teddy: {(RISK_BUST_CHANCE * 100).toFixed(0)}%
</div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Streak</div>
            <div className="mt-1 text-2xl font-black">{riskStreak}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Pot</div>
            <div className="mt-1 text-2xl font-black text-amber-200">{riskPot}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Rarity</div>
            <div className="mt-1 text-2xl font-black">
              {getRiskGiftRarity(riskStreak) || "-"}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-lg font-bold text-white">Laufband</div>
            <div className="text-sm text-zinc-400">Einsatz Start: {riskStake} Token</div>
          </div>

          <div
  ref={riskViewportRef}
  className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_60%),linear-gradient(180deg,rgba(14,14,18,1),rgba(5,5,7,1))] px-16 py-8"
>
            <div className="pointer-events-none absolute inset-y-0 left-[52.5%] z-30 w-[4px] -translate-x-1/2 bg-gradient-to-b from-transparent via-red-400 to-transparent shadow-[0_0_18px_rgba(248,113,113,0.85)]" />

            <motion.div
  animate={{ x: riskOffset }}
  transition={{
    duration: riskRunning ? 2.35 : 0.28,
    ease: riskRunning ? [0.12, 0.8, 0.18, 1] : "easeOut",
  }}
  className="flex items-center"
  style={{
    gap: `${RISK_ITEM_GAP}px`,
    width: "max-content",
  }}
>
  {riskStrip.map((symbol, index) => (
    <div
      key={`${symbol.slug}-${index}-${riskRunning ? "run" : "idle"}`}
      className={`relative flex h-40 w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-[26px] border p-3 ${
        riskSelectedIndex === index && !riskRunning
          ? "border-red-400 bg-red-500/10 shadow-[0_0_24px_rgba(248,113,113,0.28)]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_45%)]" />
      <img
        src={getSafeItemImagePath(symbol.slug, symbol.image_path)}
        alt={symbol.name}
        className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)]"
        onError={(e) => {
          e.currentTarget.src = "/items/fallback.png";
        }}
      />
    </div>
  ))}
</motion.div>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Letztes Icon: <span className="font-black">{riskSelectedItem?.name || "-"}</span>
          </div>

          {riskGameOver ? (
  // 💀 GAME OVER (Teddy)
  <div className="mt-4 rounded-3xl border border-red-500 bg-red-950/70 p-4">
    <div className="text-xs uppercase tracking-[0.2em] text-red-200">
      {zombieTeddySymbol.name}
    </div>

    <div className="mt-3 flex items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/30 bg-black/25 p-2">
        <img
          src={getSafeItemImagePath(zombieTeddySymbol.slug, zombieTeddySymbol.image_path)}
          alt={zombieTeddySymbol.name}
          className="max-h-full max-w-full object-contain"
          onError={(e) => {
            e.currentTarget.src = "/items/fallback.png";
          }}
        />
      </div>

      <div>
        <div className="text-3xl font-black text-white">GAME OVER</div>
        <div className="text-xl text-red-200">gg</div>
      </div>
    </div>
  </div>

) : riskCashedOut && lastWonItem ? (
  // 💰 AUSGEZAHLT → Geschenk anzeigen
  <div className="mt-4 rounded-3xl border border-emerald-500 bg-emerald-950/60 p-4">
    <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">
      GESCHENK ERHALTEN
    </div>

    <div className="mt-3 flex items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/30 bg-black/25 p-2">
        <img
          src={getSafeItemImagePath(lastWonItem.slug, lastWonItem.image_path)}
          alt={lastWonItem.name}
          className="max-h-full max-w-full object-contain"
          onError={(e) => {
            e.currentTarget.src = "/items/fallback.png";
          }}
        />
      </div>

      <div>
        <div className="text-3xl font-black text-white">
          {lastWonItem.name}
        </div>
        <div className="text-xl text-emerald-300">
          {lastWonItem.rarity}
        </div>
      </div>
    </div>
  </div>
) : null}

         <div className="mt-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-4">
  <div className="mb-3 flex items-center justify-between gap-3">
    <div className="text-lg font-bold text-white">Leiter</div>
    <div className="text-sm text-zinc-400 text-right">
      {riskStreak < 4
        ? `Noch ${4 - riskStreak} bis Common`
        : riskStreak < 6
          ? `Noch ${6 - riskStreak} bis Rare`
          : riskStreak < 8
            ? `Noch ${8 - riskStreak} bis Epic`
            : riskStreak < 11
              ? `Noch ${11 - riskStreak} bis Legendary`
              : "Legendary erreicht"}
    </div>
  </div>

  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    {[
      { label: "Common", need: 4 },
      { label: "Rare", need: 6 },
      { label: "Epic", need: 8 },
      { label: "Legendary", need: 11 },
    ].map((tier) => {
      const active = riskStreak >= tier.need;

      return (
        <div
          key={tier.label}
          className={`rounded-2xl border px-3 py-3 text-center transition ${
            active
              ? "border-amber-400 bg-amber-500/15 text-amber-100"
              : "border-amber-500/30 bg-amber-500/5 text-zinc-300"
          }`}
        >
          <div className="text-lg font-black leading-none">{tier.label}</div>
          <div className="mt-2 text-sm font-semibold opacity-80">{tier.need}+</div>
        </div>
      );
    })}
  </div>
</div>

          

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Button
              onClick={spinRiskGame}
              variant="violet"
              disabled={riskRunning || data.tokens < riskStake}
              className="w-full"
            >
              {riskPot > 0 ? "Weiter" : "Play"}
            </Button>

            <Button
              onClick={cashoutRiskGame}
              variant="ghost"
              disabled={riskRunning || riskPot <= 0 || riskGameOver}
              className="w-full"
            >
              Auszahlen
            </Button>

            <Button
  onClick={() => startAutoSpin("risk")}
  variant="ghost"
  disabled={
    autoSpinRunning ||
    riskRunning ||
    spinning ||
    data.tokens < riskStake
  }
  className="w-full"
>
  Auto-Start
</Button>
          </div>
        </div>
      </div>
    </div>
  ) : multiSlotMode ? (
    <div className="grid gap-3">
      {multiReels.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid grid-cols-3 gap-3 justify-items-center md:gap-10 xl:gap-16 2xl:gap-20"
        >
          {row.map((symbol, idx) => (
            <Reel
              key={`${rowIndex}-${idx}`}
              symbol={symbol}
              spinning={spinning}
              delay={(rowIndex * 3 + idx) * 0.05}
            />
          ))}
        </div>
      ))}
    </div>
  ) : (
  <div className="grid grid-cols-3 gap-0 justify-items-stretch">
    {reels.map((symbol, idx) => (
      <Reel
        key={idx}
        symbol={symbol}
        spinning={spinning}
        delay={idx * 0.08}
      />
    ))}
  </div>
)}
</div>

                    <div className="relative z-20 mt-4 rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 text-center">
                      <div className="text-[11px] uppercase tracking-[0.28em] text-zinc-400">
                        Status
                      </div>
                      <div className="mt-1 text-base font-black text-white">
                        {spinning ? "SPIN LÄUFT..." : "BEREIT FÜR DEN NÄCHSTEN DREH"}
                      </div>
                    </div>
                  </div>

{slotViewMode !== "risk" && (
  <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
    <Button
      onClick={slotViewMode === "multiline" ? spinMultiLine : spin}
      variant="violet"
      disabled={
        slotViewMode === "multiline"
          ? data.tokens < multiLineStake || spinning || autoSpinRunning
          : data.tokens < effectiveSlotCost || spinning || autoSpinRunning
      }
      className="w-full border border-violet-300/20 bg-[linear-gradient(90deg,rgba(139,92,246,1),rgba(217,70,239,1),rgba(168,85,247,1))] py-4 text-base font-black uppercase tracking-[0.12em] shadow-[0_10px_40px_rgba(168,85,247,0.45)]"
    >
      {spinning
        ? "Dreht..."
        : slotViewMode === "multiline"
          ? `${multiLineStake} Token einsetzen`
          : `${effectiveSlotCost} Token einsetzen`}
    </Button>

    <Button
      onClick={() => {
        const mode = slotViewMode === "multiline" ? "multiline-slot" : "slot";

        if (autoSpinRunning && autoSpinMode === mode) {
          stopAutoSpin();
        } else {
          startAutoSpin(mode);
        }
      }}
      variant={
        autoSpinRunning &&
        autoSpinMode === (slotViewMode === "multiline" ? "multiline-slot" : "slot")
          ? "danger"
          : "ghost"
      }
      disabled={
        !autoSpinRunning &&
        (
          spinning ||
          (slotViewMode === "multiline"
            ? data.tokens < multiLineStake
            : data.tokens < effectiveSlotCost)
        )
      }
      className="w-full py-4 text-base font-black uppercase tracking-[0.12em]"
    >
      {autoSpinRunning &&
      autoSpinMode === (slotViewMode === "multiline" ? "multiline-slot" : "slot")
        ? "Stop"
        : "Auto-Start"}
    </Button>
  </div>
)}
                  

                </div>

                <AnimatePresence>
                  {lastWin && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`relative overflow-hidden rounded-3xl border p-4 ${rarityStyles[lastWin.rarity]}`}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_45%)]" />

                      <div className="relative z-10 mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-black uppercase tracking-[0.25em]">
                        JACKPOT
                      </div>

                      <div className="relative z-10 flex items-center gap-3">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-black/20 p-3 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                          <img
  src={getSafeItemImagePath(lastWin.slug, lastWin.image_path)}
  alt={lastWin.name}
  className="max-h-full max-w-full object-contain"
  onError={(e) => {
    e.currentTarget.src = "/items/fallback.png";
  }}
/>
                        </div>

                        <div>
                          <div className="text-xl font-black">Treffer! {lastWin.name}</div>
                          <div className="mt-1 text-sm opacity-90">
                            Zum Inventar hinzugefügt · online gespeichert
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
                  <div className="text-sm text-zinc-400">Letzte Spins</div>
                  <div className="mt-3 space-y-2">
                    {data.spinHistory.length ? (
                      data.spinHistory.map((spinItem) => (
                        <div
                          key={spinItem.at}
                          className="flex items-center justify-between rounded-2xl bg-black/40 px-3 py-3 text-sm"
                        >
                          <span>{spinItem.reels.join(" · ")}</span>
                          <span
                            className={spinItem.won ? "text-emerald-300" : "text-zinc-400"}
                          >
                            {spinItem.won ? "Treffer" : "Kein Treffer"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-black/40 px-3 py-3 text-sm text-zinc-400">
                        Noch keine Spins.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {screen === "profile" && (
  <div className="space-y-6">
    <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setProfileTab("profile")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            profileTab === "profile" ? "bg-white text-black" : "bg-white/10 text-white"
          }`}
        >
          Profil
        </button>

        <button
          onClick={() => setProfileTab("friends")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            profileTab === "friends" ? "bg-white text-black" : "bg-white/10 text-white"
          }`}
        >
          Freunde
        </button>

        <button
          onClick={() => setProfileTab("chat")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            profileTab === "chat" ? "bg-white text-black" : "bg-white/10 text-white"
          }`}
        >
          Chat
        </button>

        <button
          onClick={() => setProfileTab("inventory")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            profileTab === "inventory" ? "bg-white text-black" : "bg-white/10 text-white"
          }`}
        >
          Inventar
        </button>
      </div>

      {profileTab === "profile" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <img
              src={avatarUrl || "/default-avatar.png"}
              alt="Avatar"
              className="h-20 w-20 rounded-full object-cover border border-white/10"
            />

            <div className="space-y-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Anzeigename"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              />

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar(file);
                }}
                className="block text-sm"
              />

              <button
                onClick={saveProfile}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black"
              >
                Profil speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {profileTab === "friends" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="text-sm font-bold text-white">Freunde suchen</div>
            <div className="flex gap-2">
              <input
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                placeholder="Name suchen..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              />
              <button
                onClick={searchUsers}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black"
              >
                Suchen
              </button>
            </div>

            <div className="space-y-2">
              {friendSearchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar_url || "/default-avatar.png"}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="font-semibold">
                      {user.display_name || user.username || "Unbekannt"}
                    </div>
                  </div>

                  <button
                    onClick={() => sendFriendRequest(user.id)}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white"
                  >
                    Hinzufügen
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-bold text-white">Anfragen</div>
            {friendRequests.length === 0 && (
              <div className="text-sm text-zinc-400">Keine offenen Anfragen.</div>
            )}

            {friendRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={request.sender_profile?.avatar_url || "/default-avatar.png"}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div className="font-semibold">
                    {request.sender_profile?.display_name ||
                      request.sender_profile?.username ||
                      "Unbekannt"}
                  </div>
                </div>

                <button
                  onClick={() => acceptFriendRequest(request)}
                  className="rounded-xl bg-green-600 px-3 py-2 text-sm font-bold text-white"
                >
                  Annehmen
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-bold text-white">Freundesliste</div>
            {friends.length === 0 && (
              <div className="text-sm text-zinc-400">Noch keine Freunde.</div>
            )}

            {friends.map((friend) => (
  <div
    key={friend.id}
    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
  >
    <div className="flex items-center gap-3">
      <img
        src={friend.profile?.avatar_url || "/default-avatar.png"}
        alt=""
        className="h-10 w-10 rounded-full object-cover"
      />
      <div className="font-semibold">
        {friend.profile?.display_name || friend.profile?.username || "Unbekannt"}
      </div>
    </div>

    <div className="flex items-center gap-2">
      <button
        onClick={() => openChatWithFriend(friend.friend_id)}
        className="rounded-xl bg-purple-600 px-3 py-2 text-sm font-bold text-white"
      >
        Öffnen
      </button>

      <button
  onClick={() => deleteChatById(friend.id)}
  className="rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white"
>
  Löschen
</button>
    </div>
  </div>
))}
          </div>
        </div>
      )}

      {profileTab === "chat" && (
  <div className="space-y-2">
    <div className="text-sm text-zinc-400">
      Hier siehst du nur bestehende Chats.
    </div>

    {chatList.length === 0 ? (
      <div className="text-sm text-zinc-400">Noch keine Chats vorhanden.</div>
    ) : (
      chatList.map((chat) => (
        <div
          key={chat.id}
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
        >
          <div className="flex items-center gap-3">
            <img
              src={chat.profile?.avatar_url || "/default-avatar.png"}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="font-semibold">
              {chat.profile?.display_name || chat.profile?.username || "Unbekannt"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openChatWithFriend(chat.friend_id)}
              className="rounded-xl bg-purple-600 px-3 py-2 text-sm font-bold text-white"
            >
              Öffnen
            </button>

            <button
              onClick={() => deleteChatById(chat.id)}
              className="rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white"
            >
              Löschen
            </button>
          </div>
        </div>
      ))
    )}
  </div>
)}

      {profileTab === "inventory" && (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2">
      <select
        value={inventoryFilter}
        onChange={(e) => setInventoryFilter(e.target.value as typeof inventoryFilter)}
        className="rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none"
      >
        <option value="all">Alle Items</option>
        <option value="boxes">Nur Mysteryboxen</option>
        <option value="Common">Nur Common</option>
        <option value="Rare">Nur Rare</option>
        <option value="Epic">Nur Epic</option>
        <option value="Super">Nur Super</option>
        <option value="Legendary">Nur Legendary</option>
        <option value="Ultra">Nur Ultra</option>
      </select>

      <select
        value={inventorySort}
        onChange={(e) => setInventorySort(e.target.value as typeof inventorySort)}
        className="rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none"
      >
        <option value="rarity-desc">Rarity absteigend</option>
        <option value="rarity-asc">Rarity aufsteigend</option>
        <option value="latest">Zuletzt hinzugefügt</option>
      </select>
    </div>

    {inventoryDisplayItems.length === 0 ? (
  <div className="text-sm text-zinc-400">Keine passenden Items gefunden.</div>
) : (
  inventoryDisplayItems.map((item) => {
    const isExpanded =
      !item.isBox && expandedInventoryStackSlug === item.slug;

    const matchingSingleItems = myOnlineInventory.filter(
      (inv) =>
        !isMysteryBoxSlug(inv.slug) &&
        inv.slug === item.slug
    );

    return (
      <div
        key={item.isBox ? item.inventory_id : item.slug}
        className="rounded-2xl border border-white/10 bg-white/5 p-3"
      >
        <div
          onClick={() => {
            if (item.isBox) {
              openItemDetail({
                inventory_id: item.inventory_id,
                slug: item.slug,
                name: item.name,
                rarity: item.rarity,
                image_path: item.image_path,
              });
              return;
            }

            setExpandedInventoryStackSlug((prev) =>
              prev === item.slug ? null : item.slug
            );
          }}
          className="flex cursor-pointer items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <img
              src={getSafeItemImagePath(item.slug, item.image_path)}
              alt={item.name}
              className="h-12 w-12 rounded-xl object-contain"
              onError={(e) => {
                e.currentTarget.src = "/items/fallback.png";
              }}
            />

            <div>
              <div className="font-semibold">{item.name}</div>
              <div className="text-xs text-zinc-400">
                {item.rarity}
                {!item.isBox ? ` · x${item.quantity}` : ""}
              </div>
            </div>
          </div>

          {item.isBox ? (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                openMysteryBox({
                  inventory_id: item.inventory_id,
                  id: item.id,
                  slug: item.slug,
                  name: item.name,
                  rarity: item.rarity as LocalInventoryItem["rarity"],
                  image_path: item.image_path,
                  weight: item.weight,
                });
              }}
              variant="violet"
              className="px-4 py-2 text-sm"
            >
              Öffnen
            </Button>
          ) : (
            <div className="text-sm text-zinc-400">
              {isExpanded ? "▲" : "▼"}
            </div>
          )}
        </div>

        {!item.isBox && isExpanded && (
          <div className="mt-3 space-y-2">
            {matchingSingleItems.map((single) => (
              <button
                key={single.inventory_id}
                type="button"
                onClick={() =>
                  openItemDetail({
                    inventory_id: single.inventory_id,
                    slug: single.slug,
                    name: single.name,
                    rarity: single.rarity,
                    image_path: single.image_path,
                  })
                }
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-left transition hover:bg-black/40"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={getSafeItemImagePath(single.slug, single.image_path)}
                    alt={single.name}
                    className="h-10 w-10 rounded-lg object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/items/fallback.png";
                    }}
                  />
                  <div>
                    <div className="font-semibold text-white">{single.name}</div>
                    <div className="text-xs text-zinc-400">
                      {single.rarity} · #{single.inventory_id.slice(0, 8)}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-zinc-500">Ansehen</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  })
)}
  </div>
)}
    </div>
  </div>
)}

            {screen === "group" && (
              <motion.div
                key="group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-auto w-full max-w-md space-y-4 md:max-w-5xl xl:max-w-7xl 2xl:max-w-[1600px]"
              >
                {!userEmail ? (
                  <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-5 shadow-xl">
                    <div className="text-sm text-zinc-400">Freundesmodus</div>
                    <div className="mt-1 text-2xl font-black">Erst mit Google anmelden</div>
                    <div className="mt-2 text-sm text-zinc-400">
                      Dann kannst du mehrere Gruppen nutzen und Inventare ansehen.
                    </div>
                    <Button
                      onClick={signInWithGoogle}
                      className="mt-4 flex w-full items-center justify-center gap-2"
                    >
                      <LogIn className="h-4 w-4" />
                      Mit Google anmelden
                    </Button>
                  </div>
                ) : (
                  <>
                    

                    <div className="space-y-3 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
                      <div className="text-lg font-bold">Gruppe erstellen</div>
                      <input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="z. B. CDL Crew"
                        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
                      />
                      <Button onClick={createGroup} variant="violet" className="w-full">
                        Gruppe erstellen
                      </Button>
                    </div>

                    <div className="space-y-3 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
                      <div className="text-lg font-bold">Gruppe beitreten</div>
                      <input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder="Code eingeben"
                        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 uppercase outline-none"
                      />
                      <Button onClick={joinGroup} className="w-full">
                        Beitreten
                      </Button>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
                      <div className="text-lg font-bold">Meine Gruppen</div>
                      {myGroups.length ? (
                        <div className="mt-3 space-y-2">
                          {myGroups.map((group) => (
                            <button
                              key={group.id}
                              onClick={() => {
                                setActiveGroupId(group.id);
                                setSelectedMember(null);
                              }}
                              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                                activeGroupId === group.id
                                  ? "border-violet-400 bg-violet-500/20"
                                  : "border-white/10 bg-black/40"
                              }`}
                            >
                              <div>
                                <div className="font-semibold">{group.name}</div>
                                <div className="text-xs text-zinc-500">{group.invite_code}</div>
                              </div>
                              <div className="text-xs text-zinc-400">
                                {group.owner_id === userId ? "Owner" : "Mitglied"}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-zinc-500">Noch keine Gruppen.</div>
                      )}
                    </div>

                    {activeGroup ? (
                      <>
                        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm text-zinc-400">Aktive Gruppe</div>
                              <div className="text-2xl font-black">{activeGroup.name}</div>
                              <div className="mt-2 text-sm text-zinc-400">
                                Rolle: {activeGroup.owner_id === userId ? "Besitzer" : "Mitglied"}
                              </div>
                            </div>
                            <button
                              onClick={copyInviteCode}
                              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                            >
                              <Copy className="h-4 w-4" />
                              {activeGroup.invite_code}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            onClick={copyInviteCode}
                            variant="ghost"
                            className="flex items-center justify-center gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Code kopieren
                          </Button>

                          {activeGroup.owner_id === userId ? (
                            <Button onClick={deleteGroup} variant="danger">
                              Gruppe löschen
                            </Button>
                          ) : (
                            <Button onClick={leaveGroup} variant="danger">
                              Gruppe verlassen
                            </Button>
                          )}
                        </div>

                        <div className="space-y-3">
  <div className="text-lg font-bold">Mitglieder</div>

  {groupRows.map((member, index) => (
    <div
      key={member.user_id}
      className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl"
    >
      <div className="flex items-center justify-between gap-3">
  <button
    onClick={() => {
      const inventory = memberInventories.find(
        (entry) => entry.user_id === member.user_id
      );
      if (inventory) setSelectedMember(inventory);
    }}
    className="flex flex-1 items-center gap-3 text-left"
  >
    <img
      src={member.avatar_url || "/default-avatar.png"}
      alt={member.username}
      className="h-10 w-10 rounded-full border border-white/10 object-cover"
    />

    <div className="flex flex-1 items-center gap-4">
      <div className="flex flex-col">
        <div className="font-bold">
          {member.username}
          {member.isMe ? " (Du)" : ""}
        </div>

        <div className="text-xs text-zinc-400">
          Inventar: {
            memberInventories.find((m) => m.user_id === member.user_id)?.items.length || 0
          }
        </div>
      </div>

      <MemberShowcaseBox
  member={member}
  currentUserId={userId}
  onUpload={uploadShowcaseImage}
  uploading={showcaseUploading}
/>
    </div>
  </button>

  {activeGroup.owner_id === userId && member.user_id !== userId ? (
    <button
      onClick={() => removeMemberFromGroup(member.user_id)}
      className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-200"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  ) : null}
</div>
    </div>
  ))}

  <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
    <div className="text-lg font-bold">Bet-King</div>
    <div className="mt-2 text-sm text-zinc-400">
      Punktewertung für Gruppentipps auf exakte Ergebnisse.
    </div>

    <Button
      onClick={() => setShowBetKingModal(true)}
      variant="violet"
      className="mt-4 w-full"
    >
      BET-KING
    </Button>
  </div>
</div>

                        <div className="space-y-3">
                          <div className="text-lg font-bold">Eingehende Challenges</div>

                          

                          {incomingChallenges.length ? (
                            incomingChallenges.map((challenge) => {
                              const meta = getChallengeDisplayMeta(challenge);

                              return (
                                <div
                                  key={challenge.id}
                                  className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl"
                                >
                                  <div className="text-sm text-zinc-400">
                                    Neue Firstshot-Challenge
                                  </div>

                                  <div className="mt-1 font-semibold">
                                    {meta.fromName} fordert dich heraus
                                  </div>

                                  
<div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                    <ItemCard
                                      item={{
                                        name: meta.offeredName,
                                        rarity:
                                          getInventoryMeta(
                                            challenge.offered_inventory_item_id
                                          )?.item.rarity || "Common",
                                        image_path: meta.offeredImage,
                                      }}
                                    />
                                    <span className="text-center text-zinc-500">↔</span>
                                    <ItemCard
                                      item={{
                                        name: meta.requestedName,
                                        rarity:
                                          getInventoryMeta(
                                            challenge.requested_inventory_item_id
                                          )?.item.rarity || "Common",
                                        image_path: meta.requestedImage,
                                      }}
                                    />
                                  </div>

                                  <div className="mt-3 grid grid-cols-2 gap-3">
                                    <Button
                                      onClick={() => acceptChallenge(challenge.id)}
                                      variant="violet"
                                    >
                                      Annehmen
                                    </Button>
                                    <Button
                                      onClick={() => declineChallenge(challenge.id)}
                                      variant="danger"
                                    >
                                      Ablehnen
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-500">
                              Keine eingehenden Challenges.
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
  <div className="text-lg font-bold">Alle meine Challenges</div>

  {activeFirstshotChallenges.length ? (
    activeFirstshotChallenges.map((challenge) => {
      const meta = getChallengeDisplayMeta(challenge);

      const canPlayFirst =
        challenge.status === "accepted" &&
        challenge.first_player_id === userId &&
        challenge.first_player_time == null;

      const canPlaySecond =
        challenge.status === "second_turn" &&
        challenge.second_player_id === userId &&
        challenge.second_player_time == null;

      return (
        <div
          key={challenge.id}
          className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-sm text-zinc-400">
                {meta.fromName} vs {meta.toName}
              </div>

              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <ItemCard
                  item={{
                    name: meta.offeredName,
                    rarity:
                      getInventoryMeta(challenge.offered_inventory_item_id)?.item.rarity || "Common",
                    image_path: meta.offeredImage,
                  }}
                />
                <span className="text-center text-zinc-500">↔</span>
                <ItemCard
                  item={{
                    name: meta.requestedName,
                    rarity:
                      getInventoryMeta(challenge.requested_inventory_item_id)?.item.rarity || "Common",
                    image_path: meta.requestedImage,
                  }}
                />
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                {challenge.is_draw
                  ? "Unentschieden"
                  : getChallengeStatusLabel(challenge.status)}
              </div>
            </div>

            <div className="text-right text-xs text-zinc-500">
              {new Date(challenge.created_at).toLocaleString("de-DE")}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {canPlayFirst ? (
              <Button
                onClick={() => openChallengeModal(challenge)}
                variant="violet"
                className="px-3 py-2 text-sm"
              >
                FirstShot starten
              </Button>
            ) : null}

            {canPlaySecond ? (
              <Button
                onClick={() => openChallengeModal(challenge)}
                variant="violet"
                className="px-3 py-2 text-sm"
              >
                Jetzt spielen
              </Button>
            ) : null}

            <Button
              onClick={() => openChallengeModal(challenge)}
              variant="ghost"
              className="px-3 py-2 text-sm"
            >
              Anzeigen
            </Button>
          </div>
        </div>
      );
    })
  ) : (
    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-500">
      Keine aktiven Challenges vorhanden.
    </div>
  )}

  <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-4">
    <button
      type="button"
      onClick={() => setShowPastChallenges((prev) => !prev)}
      className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-left"
    >
      <span className="font-semibold text-white">
        Vergangene FirstShot-Spiele ({pastFirstshotChallenges.length})
      </span>
      <span className="text-sm text-zinc-400">
        {showPastChallenges ? "▲" : "▼"}
      </span>
    </button>

    {showPastChallenges && (
      <div className="mt-3 space-y-3">
        {pastFirstshotChallenges.length ? (
          pastFirstshotChallenges.map((challenge) => {
            const meta = getChallengeDisplayMeta(challenge);

            return (
              <div
                key={challenge.id}
                className="rounded-3xl border border-white/10 bg-black/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm text-zinc-400">
                      {meta.fromName} vs {meta.toName}
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">
                      {challenge.is_draw
                        ? "Unentschieden"
                        : getChallengeStatusLabel(challenge.status)}
                    </div>
                  </div>

                  <div className="text-right text-xs text-zinc-500">
                    {new Date(challenge.created_at).toLocaleString("de-DE")}
                  </div>
                </div>

                <div className="mt-3">
                  <Button
                    onClick={() => openChallengeModal(challenge)}
                    variant="ghost"
                    className="px-3 py-2 text-sm"
                  >
                    Anzeigen
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-500">
            Keine vergangenen Challenges vorhanden.
          </div>
        )}
      </div>
    )}
  </div>
</div>

                        {!!outgoingChallenges.length && (
                          <div className="hidden">{outgoingChallenges.length}</div>
                        )}
                      </>
                    ) : null}
                  </>
                )}
              </motion.div>
            )}

            {screen === "admin" && (
  <motion.div
    key="admin"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="mx-auto w-full max-w-md space-y-4 pb-24 md:max-w-5xl xl:max-w-7xl 2xl:max-w-[1600px]"
  >
    {!isAdmin ? (
  <>
    <SectionTitle
      eyebrow="Sammlung"
      title="Prestige"
      right={<Package className="h-5 w-5 text-emerald-300" />}
    />

    <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
      <div className="text-sm text-zinc-400">Prestige Sammlung</div>
      <div className="mt-1 text-2xl font-black">Alle Items</div>
      <div className="mt-2 text-sm text-zinc-400">
        {ownedItemSlugs.size} / {allItemCatalog.length} gesammelt
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
          style={{
            width: `${
              allItemCatalog.length
                ? (ownedItemSlugs.size / allItemCatalog.length) * 100
                : 0
            }%`,
          }}
        />
      </div>
    </div>

<div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
  <div className="text-sm text-zinc-400">Herausforderungen</div>
  <div className="mt-1 text-2xl font-black">Sammelziele</div>

  <div className="mt-4 space-y-3">
    {PRESTIGE_CHALLENGES.map((challenge) => {
      const ownedCount = inventoryCountMap.get(challenge.requiredSlug) || 0;
      const completed = ownedCount >= challenge.requiredCount;

      const requiredItem = allItemCatalog.find(
        (item) => item.slug === challenge.requiredSlug
      );

      return (
        <div
          key={challenge.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/30 p-2">
              {requiredItem ? (
                <img
  src={getSafeItemImagePath(requiredItem.slug, requiredItem.image_path)}
  alt={requiredItem.name}
  className={`max-h-full max-w-full object-contain transition ${
    ownedCount > 0 ? "opacity-100" : "grayscale opacity-35"
  }`}
  onError={(e) => {
    e.currentTarget.src = "/items/fallback.png";
  }}
/>
              ) : null}
            </div>

            <div className="text-lg font-black text-zinc-400">×</div>

            <div className="min-w-[52px] text-center">
              <div className="text-lg font-black">{challenge.requiredCount}</div>
              <div className="text-[11px] text-zinc-500">benötigt</div>
            </div>

            <div className="text-lg font-black text-zinc-400">=</div>

            <div
  className={`flex h-16 w-16 items-center justify-center rounded-2xl border p-2 ${
    rewardBoxStyles[challenge.rewardRarity] || rewardBoxStyles.Common
  }`}
>
  <img
    src={getMysteryBoxImagePath(challenge.rewardRarity)}
    alt={`${challenge.rewardRarity} Mystery Box`}
    className="max-h-full max-w-full object-contain"
    onError={(e) => {
      e.currentTarget.src = "/items/fallback.png";
    }}
  />
</div>
          </div>

          <div className="min-w-[120px] text-right">
            <div className="text-sm font-semibold text-white">
              {ownedCount} / {challenge.requiredCount}
            </div>
            <div className={`text-xs ${completed ? "text-emerald-300" : "text-zinc-500"}`}>
              {completed ? "Bereit" : challenge.rewardRarity}
            </div>
          </div>
        </div>
      );
    })}
  </div>
</div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {allItemCatalog.map((item) => {
        const owned = ownedItemSlugs.has(item.slug);

        return (
          <div
            key={item.id}
            className={`relative overflow-hidden rounded-3xl border p-4 transition ${
              owned
                ? "border-violet-500/30 bg-violet-500/10 shadow-[0_0_24px_rgba(139,92,246,0.22)]"
                : "border-white/10 bg-black/40"
            }`}
          >
            <div className="flex h-28 items-center justify-center rounded-2xl bg-black/20 p-3">
              <img
                src={getSafeItemImagePath(item.slug, item.image_path)}
                alt={item.name}
                className={`max-h-full max-w-full object-contain transition ${
                  owned ? "opacity-100" : "grayscale opacity-35"
                }`}
                onError={(e) => {
                  e.currentTarget.src = "/items/fallback.png";
                }}
              />
            </div>

            <div className={`mt-3 text-sm font-bold ${owned ? "text-white" : "text-zinc-400"}`}>
              {item.name}
            </div>

            <div className={`text-xs ${owned ? "text-zinc-300" : "text-zinc-500"}`}>
              {normalizeRarity(item.rarity)}
            </div>

            {!owned && (
              <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/60 px-2 py-1 text-[10px] font-bold text-zinc-400">
                NICHT ENTDECKT
              </div>
            )}
          </div>
        );
      })}
    </div>
  </>
) : (
      <>
        <SectionTitle
  eyebrow="Verwaltung"
  title="Admin-Bereich"
  right={<Settings2 className="h-5 w-5 text-violet-300" />}
/>

{/* 🔥 ITEM UPLOADER START */}
<div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
  <div className="text-lg font-bold">Item hochladen</div>

  <div className="mt-3">
    <input
      type="file"
      accept="image/png"
      onChange={(e) => {
        const file = e.target.files?.[0] || null;
        setNewItemFile(file);
      }}
      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
    />
  </div>

  <div className="mt-3 grid grid-cols-2 gap-2">
    <input
      type="text"
      placeholder="Name"
      value={newItemName}
      onChange={(e) => setNewItemName(e.target.value)}
      className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
    />

    <select
  value={newItemRarity}
  onChange={(e) => setNewItemRarity(e.target.value as LocalSymbol["rarity"])}
  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
>
  <option value="Common">Common</option>
  <option value="Rare">Rare</option>
  <option value="Epic">Epic</option>
  <option value="Super">Super</option>
  <option value="Legendary">Legendary</option>
  <option value="Ultra">Ultra</option>
</select>
  </div>

  <input
    type="text"
    placeholder="Kategorie"
    value={newItemCategory}
    onChange={(e) => setNewItemCategory(e.target.value)}
    className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
  />

  <textarea
    placeholder="Detailtext"
    value={newItemDetailText}
    onChange={(e) => setNewItemDetailText(e.target.value)}
    className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
  />

  <Button
    onClick={uploadAdminItem}
    className="mt-3 w-full"
    variant="violet"
  >
    Item hochladen
  </Button>
</div>
{/* 🔥 ITEM UPLOADER END */}

        {showItemList && (
  <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
    <div className="flex items-center gap-2 font-semibold">
      <CheckCircle2 className="h-4 w-4" />
      Alle Items
    </div>

    <div className="mt-4 grid grid-cols-2 gap-3">
      {allItemCatalog.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-white/10 bg-black/30 p-3"
        >
          <ItemCard
            item={{
              name: item.name,
              rarity: item.rarity,
              image_path: item.image_path,
              slug: item.slug,
              category: item.category,
            }}
          />

          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.slot_enabled !== false}
                onChange={async (e) => {
                  const { error } = await supabase
                    .from("items")
                    .update({ slot_enabled: e.target.checked })
                    .eq("id", item.id);

                  if (error) {
                    setMessage(error.message);
                    return;
                  }

                  await loadAllItems();
                }}
              />
              Für Slots aktiv
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.multiline_enabled === true}
                onChange={async (e) => {
                  const { error } = await supabase
                    .from("items")
                    .update({ multiline_enabled: e.target.checked })
                    .eq("id", item.id);

                  if (error) {
                    setMessage(error.message);
                    return;
                  }

                  await loadAllItems();
                }}
              />
              Für Multi-Line Slots aktiv
            </label>

            <label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={item.risk_enabled === true}
    onChange={async (e) => {
      const { error } = await supabase
        .from("items")
        .update({ risk_enabled: e.target.checked })
        .eq("id", item.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      await loadAllItems();
    }}
  />
  Für Risk Game aktiv
</label>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

                <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-zinc-400">Turnierbereich</div>
                        <div className="text-lg font-bold">
                          {currentMajor.label} · Week {getDisplayWeek(currentWeek)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {majorStructure.map((major) => (
                        <button
                          key={major.id}
                          onClick={() => changeMajor(major.id)}
                          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                            major.id === data.currentMajor
                              ? "bg-violet-500 text-white"
                              : "bg-white/5 text-zinc-300"
                          }`}
                        >
                          {major.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2 overflow-x-auto">
                      {visibleWeeks.map((week) => (
  <button
    key={week.id}
    onClick={() => changeWeek(week.id)}
    className={`rounded-xl px-3 py-2 text-sm font-semibold ${
      week.id === currentWeek
        ? "bg-violet-500 text-white"
        : "bg-white/5 text-zinc-300"
    }`}
  >
    {week.label}
  </button>
))}
                      
                    </div>
                  </div>
                </div>

                <form
  onSubmit={addMatch}
  className="space-y-4 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl"
>
  <div className="flex items-center justify-between gap-3">
    <div className="text-lg font-bold">Match hinzufügen</div>

    <Button
      type="button"
      variant="ghost"
      onClick={() => setShowItemList((prev) => !prev)}
      className="px-4 py-2"
    >
      {showItemList ? "Item-Liste schließen" : "Item-Liste"}
    </Button>
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <div className="mb-2 text-sm text-zinc-400">Team A</div>
      <div className="grid grid-cols-1 gap-2">
        {allTeams.map((team) => (
          <button
            key={`A-${team}`}
            type="button"
            onClick={() =>
              setAdminDraft((prev) => ({ ...prev, teamA: team }))
            }
            className={`h-6 rounded-lg border px-2 text-left text-[11px] flex items-center ${
  adminDraft.teamA === team
    ? "border-violet-400 bg-violet-500/20"
    : "border-white/10 bg-black/40"
}`}
            
          >
            <div className="flex items-center gap-2">
  <span className="scale-[0.5] origin-left">
    <TeamMini name={team} />
  </span>
  <span className="truncate leading-none">{team}</span>
</div>
          </button>
        ))}
      </div>
    </div>

    <div>
      <div className="mb-2 text-sm text-zinc-400">Team B</div>
      <div className="grid grid-cols-1 gap-2">
        {allTeams.map((team) => (
          <button
            key={`B-${team}`}
            type="button"
            onClick={() =>
              setAdminDraft((prev) => ({ ...prev, teamB: team }))
            }
            className={`h-6 rounded-lg border px-2 text-left text-[11px] flex items-center ${
  adminDraft.teamB === team
    ? "border-cyan-400 bg-cyan-500/20"
    : "border-white/10 bg-black/40"
}`}
          >
            <div className="flex items-center gap-2">
  <span className="scale-[0.5] origin-left">
    <TeamMini name={team} />
  </span>
  <span className="truncate leading-none">{team}</span>
</div>
          </button>
        ))}
      </div>
    </div>
  </div>

  <div className="grid grid-cols-2 gap-3">
    <div>
      <div className="mb-2 text-sm text-zinc-400">Quote Team A</div>
      <input
        type="number"
        step="0.01"
        min="1.01"
        value={adminDraft.oddA}
        onChange={(e) =>
          setAdminDraft((prev) => ({
            ...prev,
            oddA: e.target.value,
          }))
        }
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
      />
    </div>

    <div>
      <div className="mb-2 text-sm text-zinc-400">Quote Team B</div>
      <input
        type="number"
        step="0.01"
        min="1.01"
        value={adminDraft.oddB}
        onChange={(e) =>
          setAdminDraft((prev) => ({
            ...prev,
            oddB: e.target.value,
          }))
        }
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
      />
    </div>
  </div>

  <div className="grid grid-cols-2 gap-3">
    <div>
      <div className="mb-2 text-sm text-zinc-400">Datum</div>
      <input
        type="date"
        value={adminDraft.date}
        onChange={(e) =>
          setAdminDraft((prev) => ({
            ...prev,
            date: e.target.value,
          }))
        }
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
      />
    </div>

    <div>
      <div className="mb-2 text-sm text-zinc-400">Uhrzeit</div>
      <input
        type="time"
        value={adminDraft.startsAt}
        onChange={(e) =>
          setAdminDraft((prev) => ({
            ...prev,
            startsAt: e.target.value,
          }))
        }
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
      />
    </div>
  </div>

  <Button
    type="submit"
    variant="violet"
    className="flex w-full items-center justify-center gap-2"
  >
    <Plus className="h-4 w-4" />
    Match speichern
  </Button>
</form>
<div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
  DEBUG → currentMajor: {data.currentMajor} | currentWeek: {currentWeek} | matches: {matches.length}
</div>
                <div className="space-y-3">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="space-y-3 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2 font-bold">
                          <TeamLabel name={match.teamA} />
                          <span className="text-zinc-500">vs</span>
                          <TeamLabel name={match.teamB} />
                        </div>
                        <button
                          onClick={() => deleteMatch(match.id)}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
<Button
  onClick={() => updateMatch(match.id, "locked", !match.locked)}
  variant="ghost"
  className="w-full"
>
  {match.locked ? "Entsperren" : "Sperren"}
</Button>
                      <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
  <div className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
    Ergebnis
  </div>

  <div className="flex flex-wrap items-center gap-2">
    <input
      type="number"
      min={0}
      max={9}
      value={adminScores[match.id]?.scoreA ?? (match.scoreA ?? "")}
      onChange={(e) =>
        setAdminScores((prev) => ({
          ...prev,
          [match.id]: {
            scoreA: e.target.value,
            scoreB: prev[match.id]?.scoreB ?? String(match.scoreB ?? ""),
          },
        }))
      }
      className="w-20 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-center text-white outline-none"
      placeholder="A"
    />

    <span className="text-zinc-400">:</span>

    <input
      type="number"
      min={0}
      max={9}
      value={adminScores[match.id]?.scoreB ?? (match.scoreB ?? "")}
      onChange={(e) =>
        setAdminScores((prev) => ({
          ...prev,
          [match.id]: {
            scoreA: prev[match.id]?.scoreA ?? String(match.scoreA ?? ""),
            scoreB: e.target.value,
          },
        }))
      }
      className="w-20 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-center text-white outline-none"
      placeholder="B"
    />

    <Button
      onClick={() => saveMatchResult(match.id)}
      variant="violet"
      className="ml-2"
    >
      Ergebnis eintragen
    </Button>
  </div>

  {hasSavedScore(match) ? (
    <div className="mt-2 text-sm text-emerald-300">
      Gespeichert: {match.scoreA}:{match.scoreB}
    </div>
  ) : null}
</div>
                    </div>
                  ))}
                </div>
<div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
  RAW WEEK MATCHES → {(data.weeks[data.currentMajor]?.[currentWeek] || []).length}
</div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={exportData}
                    variant="ghost"
                    className="flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Export
                  </Button>
                  <Button
                    onClick={resetAll}
                    variant="danger"
                    className="flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>

                
              </>
            )}
          </motion.div>
        )}
          </AnimatePresence>

          {message ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
              {message}
            </div>
          ) : null}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 mx-auto w-full max-w-md border-t border-white/10 bg-black/85 px-3 py-3 backdrop-blur md:max-w-5xl xl:max-w-7xl 2xl:max-w-[1600px]">
          <div className="grid grid-cols-6 gap-2">
  {[
    { id: "home", label: "Home", icon: Trophy },
    { id: "picks", label: "Picks", icon: Target },
    { id: "slot", label: "Slot", icon: Zap },
    { id: "profile", label: "Profil", icon: Package },
    { id: "group", label: "Lobby", icon: Users },
    { id: "admin", label: isAdmin ? "Admin" : "Prestige", icon: isAdmin ? Shield : Package },
  ].map((item) => {
    const Icon = item.icon;
    const active = screen === (item.id as typeof screen);

    return (
      <button
        key={item.id}
        onClick={() => {
          setScreen(item.id as typeof screen);
        }}
        className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] transition ${
          active
            ? "bg-gradient-to-b from-violet-500 to-fuchsia-500 text-white shadow-[0_10px_30px_rgba(139,92,246,0.35)]"
            : "text-zinc-400 hover:bg-white/5"
        }`}
      >
        <Icon className="mb-1 h-4 w-4" />
        {item.label}
      </button>
    );
  })}
</div>
        </div>

        <AnimatePresence>
          {selectedMember && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
  <div className="flex items-center gap-3">
    <img
      src={selectedMember.avatar_url || "/default-avatar.png"}
      alt={selectedMember.username}
      className="h-12 w-12 rounded-full border border-white/10 object-cover shrink-0"
    />
    <div>
      <div className="text-sm text-zinc-400">Inventar</div>
      <div className="text-2xl font-black">{selectedMember.username}</div>
    </div>
  </div>

  <button
    onClick={() => setSelectedMember(null)}
    className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300"
  >
    <X className="h-4 w-4" />
  </button>
</div>

                <div className="mt-4 flex-1 overflow-y-auto pr-1">
  {selectedMember.items.length === 0 ? (
    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-zinc-500">
      Keine Items
    </div>
  ) : (
    <div className="grid grid-cols-2 gap-3">
      {selectedMember.items.map((item) => (
        <ItemCard
  key={item.inventory_id}
  item={item}
  onClick={() =>
    openItemDetail({
      inventory_id: item.inventory_id,
      slug: item.slug,
      name: item.name,
      rarity: item.rarity,
      image_path: item.image_path,
    })
  }
  action={
    selectedMember.user_id !== userId ? (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isInventoryItemLocked(item.inventory_id)) return;
          setChallengeTargetItem(item);
          setChallengeTargetUser(selectedMember);
          setShowChallengePicker(true);
        }}
        disabled={isInventoryItemLocked(item.inventory_id)}
        className={`w-full rounded-xl px-3 py-2 text-sm font-semibold text-white transition ${
          isInventoryItemLocked(item.inventory_id)
            ? "bg-zinc-700 opacity-50"
            : "bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-[0_8px_24px_rgba(139,92,246,0.28)]"
        }`}
      >
        {isInventoryItemLocked(item.inventory_id) ? "Gebunden" : "Challenge"}
      </button>
    ) : null
  }
/>
      ))}
    </div>
  )}
</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showChallengePicker && challengeTargetItem && challengeTargetUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-zinc-400">Firstshot Challenge</div>
                    <div className="text-2xl font-black">{challengeTargetUser.username}</div>
                  </div>
                  <button
                    onClick={() => {
                      setShowChallengePicker(false);
                      setChallengeTargetItem(null);
                      setChallengeTargetUser(null);
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4">
  <div className="mb-2 text-sm text-zinc-400">Gewünschtes Item</div>
  <ItemCard item={challengeTargetItem} />
</div>

                <div className="mt-4 flex-1 overflow-y-auto pr-1">
                  <div className="mb-3 text-sm text-zinc-400">
                    Wähle dein Item als Einsatz
                  </div>

                  {myOnlineInventory.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-zinc-500">
                      Du hast keine online gespeicherten Items.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
  {myOnlineInventory.map((item) => {
    const locked = isInventoryItemLocked(item.inventory_id);
    const sameAsTarget = item.inventory_id === challengeTargetItem.inventory_id;

    return (
      <button
        key={item.inventory_id}
        type="button"
        onClick={async () => {
          if (locked) {
            setMessage("Dieses Item ist bereits in einer aktiven Challenge gebunden.");
            return;
          }

          if (sameAsTarget) {
            setMessage("Du kannst nicht dasselbe Item als Einsatz wählen.");
            return;
          }

          await createFirstshotChallenge(item);
        }}
        className="text-left"
      >
        <ItemCard
          item={item}
          action={
            <div className="text-xs text-zinc-300">
              {sameAsTarget
                ? "Kann nicht dasselbe Item sein"
                : locked
                  ? "Bereits gebunden"
                  : "Als Einsatz wählen"}
            </div>
          }
        />
      </button>
    );
  })}
</div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

                <AnimatePresence>
  {showBetBuilder && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400">Wettschein</div>
            <div className="text-2xl font-black">Offene Matches</div>
          </div>
          <button
            onClick={() => setShowBetBuilder(false)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {allOpenMatches.map((match) => (
            <div
              key={match.id}
              className="rounded-2xl border border-white/10 bg-black/30 p-4"
            >
              <div className="mb-2 text-sm text-zinc-400">{match.startsAt}</div>
              <div className="mb-3 font-bold">
                {match.teamA} vs {match.teamB}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => toggleBetSelection(match.id, "A")}
                  className={`rounded-2xl border p-3 text-left ${
                    betSelections[match.id] === "A"
                      ? "border-violet-400 bg-violet-500/20"
                      : "border-white/10 bg-black/40"
                  }`}
                >
                  <div className="font-semibold">{match.teamA}</div>
                  <div className="text-sm font-semibold text-yellow-400">
  {formatOdd(match.oddA)}
</div>
                </button>

                <button
                  type="button"
                  onClick={() => toggleBetSelection(match.id, "B")}
                  className={`rounded-2xl border p-3 text-left ${
                    betSelections[match.id] === "B"
                      ? "border-cyan-400 bg-cyan-500/20"
                      : "border-white/10 bg-black/40"
                  }`}
                >
                  <div className="font-semibold">{match.teamB}</div>
                  <div className="text-sm font-semibold text-yellow-400">
  {formatOdd(match.oddB)}
</div>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-zinc-400">Gesamtquote</div>
              <div className="text-xl font-black">{totalBetOdds.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-400">Möglicher Gewinn</div>
              <div className="text-xl font-black text-emerald-300">
                {potentialBetWin}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-2 text-sm text-zinc-400">Einsatz</div>
            <input
              type="number"
              min={1}
              value={betStake}
              onChange={(e) => setBetStake(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
            />
          </div>

          <Button onClick={placeBet} variant="violet" className="mt-4 w-full">
            Wette setzen
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
<AnimatePresence>
  {showMyBets && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[81] flex items-center justify-center bg-black/80 p-4"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400">Historie</div>
            <div className="text-2xl font-black">Meine Wetten</div>
          </div>
          <button
            onClick={() => setShowMyBets(false)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {data.bets.map((bet) => {
            const cardClass =
              bet.status === "open"
                ? "border-zinc-500/20 bg-zinc-500/10"
                : bet.status === "lost"
                  ? "border-red-500/20 bg-red-500/10"
                  : bet.status === "won"
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-amber-500/20 bg-amber-500/10";

            return (
              <div key={bet.id} className={`rounded-3xl border p-4 ${cardClass}`}>
                <div className="flex items-center justify-between">
                  <div className="font-bold uppercase">{bet.status}</div>
                  <div className="text-sm text-zinc-400">
                    {new Date(bet.created_at).toLocaleString("de-DE")}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {bet.legs.map((leg) => {
                    const match = Object.values(data.weeks)
                      .flatMap((weekMap) => Object.values(weekMap).flat())
                      .find((m) => m.id === leg.match_id);

                    const wonLeg = match?.result && match.result === leg.pick_side;
                    const lostLeg = match?.result && match.result !== leg.pick_side;

                    return (
                      <div
                        key={leg.id}
                        className="rounded-2xl border border-white/10 bg-black/30 p-3"
                      >
                        <div className="font-semibold">
                          {match?.teamA} vs {match?.teamB}
                        </div>
                        <div className="text-sm text-zinc-300">
                          Tipp: {leg.pick_side === "A" ? match?.teamA : match?.teamB}
                        </div>
                        <div className="text-sm text-zinc-400">Quote: {leg.odd.toFixed(2)}</div>

                        {hasSavedScore(match as MatchType) ? (
                          <div
                            className={`mt-1 text-sm ${
                              wonLeg ? "text-emerald-300" : lostLeg ? "text-red-300" : "text-zinc-400"
                            }`}
                          >
                            Ergebnis: {match?.scoreA}:{match?.scoreB}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-zinc-400">Einsatz</div>
                    <div className="font-bold">{bet.stake}</div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Gesamtquote</div>
                    <div className="font-bold">{bet.total_odds.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Möglicher Gewinn</div>
                    <div className="font-bold">{bet.potential_payout}</div>
                  </div>
                </div>

                {bet.status === "won" && !bet.paid_out ? (
                  <Button
                    onClick={() => payoutBet(bet)}
                    className="mt-3"
                    variant="ghost"
                  >
                    Gewinn auszahlen
                  </Button>
                ) : null}
              </div>
            );
          })}

          {!data.bets.length && (
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-500">
              Noch keine Wetten gesetzt.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

          {selectedChallengeFresh && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/85 p-3 pt-4 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 18 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.98, opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
                className={`relative w-full max-w-3xl max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-[34px] border shadow-[0_30px_120px_rgba(0,0,0,0.75)] ${
                  roundUi === "live"
                    ? "border-red-500/40 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_28%),linear-gradient(180deg,rgba(26,6,6,0.98),rgba(7,7,9,1))]"
                    : roundUi === "waiting"
                      ? "border-amber-400/30 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_28%),linear-gradient(180deg,rgba(28,18,5,0.98),rgba(7,7,9,1))]"
                      : roundUi === "finished"
                        ? selectedChallengeFresh.status === "declined"
                          ? "border-zinc-500/25 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(7,7,9,1))]"
                          : selectedChallengeFresh.is_draw
                            ? "border-zinc-500/25 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(7,7,9,1))]"
                            : selectedChallengeFresh.winner_user_id === userId
                              ? "border-emerald-500/30 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_28%),linear-gradient(180deg,rgba(6,24,18,0.98),rgba(7,7,9,1))]"
                              : "border-red-500/30 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.16),transparent_28%),linear-gradient(180deg,rgba(26,8,8,0.98),rgba(7,7,9,1))]"
                        : roundUi === "saved"
                          ? "border-cyan-500/25 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,rgba(8,20,24,0.98),rgba(7,7,9,1))]"
                          : "border-violet-500/25 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.16),transparent_28%),linear-gradient(180deg,rgba(20,14,30,0.98),rgba(7,7,9,1))]"
                }`}
              >
                <div className="pointer-events-none absolute -left-16 top-8 h-36 w-36 rounded-full bg-violet-500/15 blur-3xl" />
                <div className="pointer-events-none absolute -right-12 top-14 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 left-1/2 h-32 w-60 -translate-x-1/2 rounded-full bg-cyan-400/8 blur-3xl" />

                {(roundUi === "waiting" || roundUi === "live") && (
                  <motion.div
                    animate={{
                      opacity: [0.16, 0.34, 0.16],
                      scale: [1, 1.02, 1],
                    }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                    className={`pointer-events-none absolute inset-0 ${
                      roundUi === "live"
                        ? "bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.18),transparent_48%)]"
                        : "bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.14),transparent_48%)]"
                    }`}
                  />
                )}

                <div className="relative z-10 p-5 md:p-7">
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.35em] text-zinc-500">
                        FirstShot
                      </div>
                      <div className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
                        eSports Duel
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ${
                          roundUi === "live"
                            ? "border-red-400/30 bg-red-500/15 text-red-200"
                            : roundUi === "waiting"
                              ? "border-amber-400/30 bg-amber-500/15 text-amber-200"
                              : roundUi === "saved"
                                ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-200"
                                : roundUi === "finished"
                                  ? selectedChallengeFresh.status === "declined"
                                    ? "border-zinc-400/20 bg-zinc-500/10 text-zinc-200"
                                    : selectedChallengeFresh.is_draw
                                      ? "border-zinc-400/20 bg-zinc-500/10 text-zinc-200"
                                      : selectedChallengeFresh.winner_user_id === userId
                                        ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                                        : "border-red-400/30 bg-red-500/15 text-red-200"
                                  : "border-violet-400/30 bg-violet-500/15 text-violet-200"
                        }`}
                      >
                        {selectedChallengeFresh.is_draw
                          ? "Draw"
                          : getChallengeStatusLabel(selectedChallengeFresh.status)}
                      </div>

                      <button
                        onClick={closeChallengeModal}
                        className="rounded-2xl border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:bg-white/10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <div
                      className={`rounded-[26px] border p-4 ${
                        selectedChallengeFresh.from_user_id === userId
                          ? "border-violet-400/25 bg-violet-500/10"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
                        Player One
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-lg font-black">
                          1
                        </div>
                        <div>
                          <div className="text-lg font-black leading-none">
                            {memberNameMap.get(selectedChallengeFresh.from_user_id) || "Spieler"}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            <span>Angreifer</span>
                            {selectedChallengeFresh.from_user_id === userId && (
                              <span className="rounded-full border border-violet-400/25 bg-violet-500/15 px-2 py-0.5 font-semibold text-violet-200">
                                DU
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                        className="rounded-full border border-white/10 bg-white/5 px-5 py-3 shadow-[0_0_25px_rgba(255,255,255,0.05)]"
                      >
                        <div className="text-center">
                          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
                            Duel
                          </div>
                          <div className="text-2xl font-black tracking-[0.16em]">VS</div>
                        </div>
                      </motion.div>
                    </div>

                    <div
                      className={`rounded-[26px] border p-4 ${
                        selectedChallengeFresh.to_user_id === userId
                          ? "border-cyan-400/25 bg-cyan-500/10"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
                        Player Two
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-lg font-black">
                          2
                        </div>
                        <div>
                          <div className="text-lg font-black leading-none">
                            {memberNameMap.get(selectedChallengeFresh.to_user_id) || "Spieler"}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            <span>Verteidiger</span>
                            {selectedChallengeFresh.to_user_id === userId && (
                              <span className="rounded-full border border-cyan-400/25 bg-cyan-500/15 px-2 py-0.5 font-semibold text-cyan-200">
                                DU
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[28px] border border-white/10 bg-black/25 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-zinc-300">Einsatz</div>
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
                        Winner takes item
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="scale-[0.92] origin-left">
                        <ItemCard
                          item={{
                            name:
                              getInventoryMeta(selectedChallengeFresh.offered_inventory_item_id)
                                ?.item.name || "Unbekannt",
                            rarity:
                              getInventoryMeta(selectedChallengeFresh.offered_inventory_item_id)
                                ?.item.rarity || "Common",
                            image_path:
                              getInventoryMeta(selectedChallengeFresh.offered_inventory_item_id)
                                ?.item.image_path || "/items/fallback.png",
                            slug:
                              getInventoryMeta(selectedChallengeFresh.offered_inventory_item_id)
                                ?.item.slug || null,
                          }}
                        />
                      </div>

                      <div className="flex flex-col items-center justify-center">
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-red-200">
                          Stake
                        </div>
                        <div className="mt-2 text-2xl font-black text-zinc-500">↔</div>
                      </div>

                      <div className="scale-[0.92] origin-right">
                        <ItemCard
                          item={{
                            name:
                              getInventoryMeta(selectedChallengeFresh.requested_inventory_item_id)
                                ?.item.name || "Unbekannt",
                            rarity:
                              getInventoryMeta(selectedChallengeFresh.requested_inventory_item_id)
                                ?.item.rarity || "Common",
                            image_path:
                              getInventoryMeta(selectedChallengeFresh.requested_inventory_item_id)
                                ?.item.image_path || "/items/fallback.png",
                            slug:
                              getInventoryMeta(selectedChallengeFresh.requested_inventory_item_id)
                                ?.item.slug || null,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {roundUi === "pending" && (
                    <div className="mt-5 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8 text-center">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10">
                        <Shield className="h-9 w-9 text-violet-200" />
                      </div>
                      <div className="mt-5 text-3xl font-black">Challenge Pending</div>
                      <div className="mt-2 text-sm text-zinc-400">
                        Die Challenge wartet noch auf Annahme.
                      </div>
                    </div>
                  )}

                  {roundUi === "ready" && (
                    <div className="mt-5 rounded-[32px] border border-violet-500/20 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.16),transparent_35%),linear-gradient(180deg,rgba(22,16,32,0.98),rgba(7,7,9,1))] p-8 text-center">
                      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 shadow-[0_0_35px_rgba(139,92,246,0.16)]">
                        <Target className="h-10 w-10 text-violet-200" />
                      </div>
                      <div className="mt-5 text-4xl font-black tracking-tight">Bereit?</div>
                      <div className="mt-2 text-sm text-zinc-400">
                        Warte auf das Signal und reagiere sofort. Zu frühes Klicken zählt als Fehlstart.
                      </div>
                      <Button
                        onClick={() => beginFirstshotRound(selectedChallengeFresh)}
                        variant="violet"
                        className="mt-6 w-full py-4 text-base font-black uppercase tracking-[0.16em]"
                      >
                        FirstShot starten
                      </Button>
                    </div>
                  )}

                  {(roundUi === "waiting" || roundUi === "live") && (
                    <div className="mt-5 rounded-[32px] border border-white/10 bg-black/30 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                            Reaction Zone
                          </div>
                          <div className="text-lg font-black">
                            {roundUi === "live" ? "Jetzt feuern" : "Signal abwarten"}
                          </div>
                        </div>
                        <div
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                            roundUi === "live"
                              ? "bg-red-500/15 text-red-200"
                              : "bg-amber-500/15 text-amber-200"
                          }`}
                        >
                          {roundUi === "live" ? "LIVE" : "ARMED"}
                        </div>
                      </div>

                      <button
                        onClick={submitReaction}
                        className={`relative flex h-[360px] w-full items-center justify-center overflow-hidden rounded-[30px] border transition duration-150 ${
                          roundUi === "live"
                            ? "border-red-500/50 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.34),rgba(69,10,10,0.96))] shadow-[0_0_80px_rgba(239,68,68,0.22)]"
                            : "border-amber-400/25 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.16),rgba(32,24,10,0.96))]"
                        }`}
                      >
                        <motion.div
                          animate={
                            roundUi === "live"
                              ? { scale: [1, 1.08, 1], opacity: [0.5, 0.95, 0.5] }
                              : { scale: [1, 1.03, 1], opacity: [0.18, 0.3, 0.18] }
                          }
                          transition={{ duration: 1, repeat: Infinity }}
                          className={`pointer-events-none absolute h-72 w-72 rounded-full blur-2xl ${
                            roundUi === "live" ? "bg-red-500/30" : "bg-amber-400/20"
                          }`}
                        />

                        <motion.div
                          animate={
                            roundUi === "live"
                              ? { scale: [1, 1.1, 1] }
                              : { scale: [1, 1.02, 1] }
                          }
                          transition={{ duration: 0.9, repeat: Infinity }}
                          className={`relative z-10 flex h-44 w-44 items-center justify-center rounded-full border ${
                            roundUi === "live"
                              ? "border-red-300/40 bg-red-500/10 shadow-[0_0_50px_rgba(239,68,68,0.26)]"
                              : "border-amber-300/30 bg-amber-500/10 shadow-[0_0_35px_rgba(251,191,36,0.16)]"
                          }`}
                        >
                          <div className="text-center">
                            <div
                              className={`text-5xl font-black tracking-[0.12em] md:text-7xl ${
                                roundUi === "live" ? "text-red-100" : "text-amber-100"
                              }`}
                            >
                              {roundUi === "live" ? "SHOT!" : "WAIT"}
                            </div>
                            <div className="mt-2 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-300">
                              Tap this zone
                            </div>
                          </div>
                        </motion.div>

                        <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 w-full max-w-lg -translate-x-1/2 px-5 text-center">
                          <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-zinc-200 backdrop-blur">
                            {roundFeedback}
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {roundUi === "saved" && (
                    <div className="mt-5 rounded-[30px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_35%),linear-gradient(180deg,rgba(8,20,24,0.98),rgba(7,7,9,1))] p-8 text-center">
                      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 shadow-[0_0_35px_rgba(34,211,238,0.16)]">
                        <CheckCircle2 className="h-10 w-10 text-cyan-200" />
                      </div>
                      <div className="mt-5 text-4xl font-black">Gespeichert</div>
                      <div className="mt-2 text-sm text-zinc-400">
                        {roundFeedback || "Dein Versuch wurde gespeichert."}
                      </div>
                    </div>
                  )}

                  {roundUi === "watch" && (
                    <div className="mt-5 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8 text-center">
                      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5">
                        <Lock className="h-10 w-10 text-zinc-300" />
                      </div>
                      <div className="mt-5 text-4xl font-black">Warte</div>
                      <div className="mt-2 text-sm text-zinc-400">
                        Der andere Spieler ist zuerst dran.
                      </div>
                    </div>
                  )}

                  {roundUi === "finished" && (
                    <div className="mt-5">
                      <div
                        className={`rounded-[30px] border p-7 text-center ${
                          selectedChallengeFresh.status === "declined"
                            ? "border-zinc-500/20 bg-zinc-500/10"
                            : selectedChallengeFresh.is_draw
                              ? "border-zinc-500/20 bg-zinc-500/10"
                              : selectedChallengeFresh.winner_user_id === userId
                                ? "border-emerald-500/25 bg-emerald-500/10"
                                : "border-red-500/25 bg-red-500/10"
                        }`}
                      >
                        <motion.div
                          initial={{ scale: 0.92, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full border ${
                            selectedChallengeFresh.status === "declined"
                              ? "border-zinc-400/20 bg-zinc-500/10"
                              : selectedChallengeFresh.is_draw
                                ? "border-zinc-400/20 bg-zinc-500/10"
                                : selectedChallengeFresh.winner_user_id === userId
                                  ? "border-emerald-400/25 bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.18)]"
                                  : "border-red-400/25 bg-red-500/10 shadow-[0_0_40px_rgba(239,68,68,0.14)]"
                          }`}
                        >
                          {selectedChallengeFresh.status === "declined" ? (
                            <X className="h-10 w-10 text-zinc-200" />
                          ) : selectedChallengeFresh.is_draw ? (
                            <Shield className="h-10 w-10 text-zinc-200" />
                          ) : selectedChallengeFresh.winner_user_id === userId ? (
                            <Trophy className="h-10 w-10 text-emerald-200" />
                          ) : (
                            <Target className="h-10 w-10 text-red-200" />
                          )}
                        </motion.div>

                        <div className="mt-5 text-4xl font-black tracking-tight">
                          {selectedChallengeFresh.status === "declined"
                            ? "Abgelehnt"
                            : selectedChallengeFresh.is_draw
                              ? "Unentschieden"
                              : selectedChallengeFresh.winner_user_id === userId
                                ? "Du hast gewonnen"
                                : "Du hast verloren"}
                        </div>

                        <div className="mt-2 text-sm text-zinc-400">
                          {selectedChallengeFresh.status === "declined"
                            ? "Diese Challenge wurde abgelehnt."
                            : selectedChallengeFresh.is_draw
                              ? "Beide behalten ihre Items."
                              : selectedChallengeFresh.winner_user_id === userId
                                ? "Das gegnerische Item wurde dir übertragen."
                                : "Dein Item wurde an den Gewinner übertragen."}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-3xl border border-white/10 bg-black/35 p-4">
                          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                            Player 1
                          </div>
                          <div className="mt-2 text-lg font-black">
                            {memberNameMap.get(selectedChallengeFresh.first_player_id || "") ||
                              "Spieler 1"}
                          </div>
                          <div className="mt-3 text-3xl font-black">
                            {selectedChallengeFresh.first_player_time === 999999
                              ? "FS"
                              : selectedChallengeFresh.first_player_time ?? "-"}
                            {selectedChallengeFresh.first_player_time &&
                            selectedChallengeFresh.first_player_time !== 999999
                              ? <span className="ml-1 text-base font-semibold text-zinc-400">ms</span>
                              : null}
                          </div>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-black/35 p-4">
                          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                            Player 2
                          </div>
                          <div className="mt-2 text-lg font-black">
                            {memberNameMap.get(selectedChallengeFresh.second_player_id || "") ||
                              "Spieler 2"}
                          </div>
                          <div className="mt-3 text-3xl font-black">
                            {selectedChallengeFresh.second_player_time === 999999
                              ? "FS"
                              : selectedChallengeFresh.second_player_time ?? "-"}
                            {selectedChallengeFresh.second_player_time &&
                            selectedChallengeFresh.second_player_time !== 999999
                              ? <span className="ml-1 text-base font-semibold text-zinc-400">ms</span>
                              : null}
                          </div>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-black/35 p-4">
                          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                            Reward
                          </div>
                          <div className="mt-2 text-lg font-black">Ergebnis</div>
                          <div className="mt-3 text-sm text-zinc-300">
                            {selectedChallengeFresh.status === "declined"
                              ? "Keine Auswertung"
                              : selectedChallengeFresh.is_draw
                                ? "Kein Item-Wechsel"
                                : `${
                                    getInventoryMeta(
                                      selectedChallengeFresh.winner_user_id ===
                                        selectedChallengeFresh.from_user_id
                                        ? selectedChallengeFresh.requested_inventory_item_id
                                        : selectedChallengeFresh.offered_inventory_item_id
                                    )?.item.name || "Item"
                                  } gewonnen`}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
          {chatOpen && activeChat && (
  <div
    className="fixed z-[90] w-[360px] rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
    style={{
      left: `${chatPosition.x}px`,
      top: `${chatPosition.y}px`,
    }}
  >
    <div
  onMouseDown={startChatDrag}
  className="flex cursor-move items-center justify-between border-b border-white/10 p-3"
>
  <div className="font-bold text-white">Chat</div>

  <div className="flex items-center gap-2">
    

    <button
      type="button"
      onClick={() => setChatOpen(false)}
      className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white"
    >
      X
    </button>
  </div>
</div>

    <div className="h-80 overflow-y-auto space-y-2 p-3">
  {chatMessages.length === 0 ? (
    <div className="text-sm text-zinc-400">Noch keine Nachrichten.</div>
  ) : (
    chatMessages.map((msg) => {
      const isMe = msg.sender_id === userId;

      const friendProfile = friends.find((f) => f.friend_id === msg.sender_id)?.profile;
      const otherAvatar = friendProfile?.avatar_url || "/default-avatar.png";
      const otherName = friendProfile?.username || friendProfile?.display_name || "User";

      return (
        <div
          key={msg.id}
          className={`flex items-start gap-2 ${isMe ? "justify-end" : "justify-start"}`}
        >
          {!isMe && (
            <img
              src={otherAvatar}
              alt={otherName}
              className="h-8 w-8 rounded-full border border-white/10 object-cover"
            />
          )}

          <div
            className={`max-w-[75%] rounded-xl p-2 text-sm ${
              isMe ? "bg-blue-600 text-white" : "bg-white/10 text-white"
            }`}
          >
            {!isMe && (
              <div className="mb-1 text-[10px] text-zinc-300">
                {otherName}
              </div>
            )}
            <div className="space-y-2">
  {msg.message ? <div>{msg.message}</div> : null}

  {msg.image_url ? (
  <div className="space-y-2">
    <img
      src={msg.image_url}
      alt="Chat Bild"
      className="max-h-64 rounded-xl border border-white/10 object-cover"
    />

    <button
      type="button"
      onClick={async () => {
        try {
          const response = await fetch(msg.image_url);
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = `chat-image-${msg.id || Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();

          window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
          console.error(error);
          setMessage("Bild konnte nicht heruntergeladen werden.");
        }
      }}
      className="inline-flex rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/20"
    >
      Bild herunterladen
    </button>
  </div>
) : null}
</div>
          </div>

          {isMe && (
            <img
              src={avatarUrl || "/default-avatar.png"}
              alt="Ich"
              className="h-8 w-8 rounded-full border border-white/10 object-cover"
            />
          )}
        </div>
      );
    })
    )}
  <div ref={chatBottomRef} />
</div>

<div className="border-t border-white/10 p-3">
  <div className="flex w-full items-center gap-2">
    <label className="shrink-0 flex cursor-pointer items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white">
      Bild
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            await sendChatImage(file);
            e.currentTarget.value = "";
          }
        }}
      />
    </label>

    <input
      value={chatInput}
      onChange={(e) => setChatInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") sendMessage();
      }}
      className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2 text-white outline-none"
      placeholder="Nachricht..."
    />

    <button
      onClick={sendMessage}
      disabled={chatImageUploading}
      className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
    >
      {chatImageUploading ? "..." : "Senden"}
    </button>
  </div>
</div>
  </div>
)}
        
        <AnimatePresence>
  {itemDetailOpen && selectedItemDetail && (() => {
    const detailRarity = normalizeRarity(selectedItemDetail.rarity);

    let detailCardBg = "bg-black/30";
    let detailInnerBg = "bg-black/20";

    if (detailRarity === "Rare") {
      detailCardBg = "bg-green-950/30";
      detailInnerBg = "bg-green-500/10 shadow-[0_0_12px_rgba(34,197,94,0.25)]";
    }
    if (detailRarity === "Epic") {
      detailCardBg = "bg-blue-950/30";
      detailInnerBg = "bg-blue-500/10 shadow-[0_0_14px_rgba(59,130,246,0.3)]";
    }
    if (detailRarity === "Super") {
      detailCardBg = "bg-purple-950/30";
      detailInnerBg = "bg-purple-500/10 shadow-[0_0_16px_rgba(168,85,247,0.35)]";
    }
    if (detailRarity === "Legendary") {
      detailCardBg = "bg-amber-950/30";
      detailInnerBg = "bg-amber-500/10 shadow-[0_0_18px_rgba(245,158,11,0.4)]";
    }
    if (detailRarity === "Ultra") {
      detailCardBg = "bg-red-950/30";
      detailInnerBg = "bg-red-500/10 shadow-[0_0_22px_rgba(239,68,68,0.5)]";
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-5 shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-zinc-400">Item-Profil</div>
              <div className="text-3xl font-black">{selectedItemDetail.name}</div>
            </div>

            <button
              onClick={() => {
                setItemDetailOpen(false);
                setSelectedItemDetail(null);
                setSelectedItemHistory([]);
              }}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
            <div className={`rounded-3xl border border-white/10 p-4 ${detailCardBg}`}>
              <div className={`flex h-48 items-center justify-center rounded-2xl p-3 ${detailInnerBg}`}>
                <img
                  src={getSafeItemImagePath(selectedItemDetail.slug, selectedItemDetail.image_path)}
                  alt={selectedItemDetail.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="mt-3 text-sm text-zinc-400">{selectedItemDetail.rarity}</div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="text-sm text-zinc-400">Bio</div>
              <div className="mt-2 text-sm leading-6 text-zinc-200">
                {selectedItemDetail.detail_text || "Für dieses Item wurde keine Bio hinterlegt."}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="text-lg font-bold">Item-Verlauf</div>
            <div className="mt-3 space-y-3">
              {selectedItemHistory.length ? (
                selectedItemHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">
                          {entry.owner_name}
                        </div>
                        <div className="text-sm text-zinc-400">
                          {entry.action}
                          {entry.source_name ? ` · von ${entry.source_name}` : ""}
                          {entry.note ? ` · ${entry.note}` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(entry.created_at).toLocaleString("de-DE")}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-black/40 px-4 py-3 text-sm text-zinc-500">
                  Noch kein Verlauf vorhanden.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  })()}
</AnimatePresence>

<AnimatePresence>
  {openingBox && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
    >
      <motion.div
  initial={{ scale: 0.92, opacity: 0 }}
  animate={
    openingPhase === "flash"
      ? {
          scale: [1, 1.02, 0.995, 1],
          x: [0, -6, 6, -4, 4, 0],
          opacity: 1,
        }
      : { scale: 1, x: 0, opacity: 1 }
  }
  exit={{ scale: 0.96, opacity: 0 }}
  transition={{
    duration: openingPhase === "flash" ? 0.35 : 0.25,
    ease: "easeOut",
  }}
  className={`relative w-full max-w-2xl overflow-hidden rounded-[36px] border ${getRarityBorderClasses(openingReward?.rarity || openingBox.rarity)} bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.16),transparent_30%),linear-gradient(180deg,rgba(18,18,24,0.98),rgba(6,6,10,1))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.7)]`}
>
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />
    <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
    <div className="absolute bottom-0 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
  </div>

  {openingPhase === "flash" && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.9, 0] }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`pointer-events-none absolute inset-0 z-20 ${getRarityFlashClasses(openingReward?.rarity || openingBox.rarity)}`}
    />
  )}

  {openingPhase === "reveal" && (
  <>
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <div
        className="absolute left-1/2 top-[46%] h-[620px] w-[980px] -translate-x-1/2 -translate-y-1/2"
        style={{
          maskImage:
            "radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.88) 38%, rgba(0,0,0,0.5) 62%, rgba(0,0,0,0.18) 80%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.88) 38%, rgba(0,0,0,0.5) 62%, rgba(0,0,0,0.18) 80%, rgba(0,0,0,0) 100%)",
        }}
      >
        <video
          key={`smoke-${openingReward?.rarity || openingBox.rarity}`}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-22 mix-blend-screen grayscale brightness-105 contrast-110 blur-[3px]"
        >
          <source src="/effects/smoke-burst.webm" type="video/webm" />
        </video>
      </div>
    </div>

    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            opacity: 0,
            x: 0,
            y: 0,
            scale: 0.6,
          }}
          animate={{
            opacity: [0, 1, 0],
            x: [0, (i % 2 === 0 ? 1 : -1) * (60 + i * 12)],
            y: [0, -40 - i * 10],
            scale: [0.6, 1, 0.4],
          }}
          transition={{
            duration: 0.75 + i * 0.03,
            ease: "easeOut",
          }}
          className={`absolute left-1/2 top-1/2 h-3 w-3 rounded-full blur-[1px] ${getRarityParticleClasses(openingReward?.rarity || openingBox.rarity)}`}
        />
      ))}
    </div>
  </>
)}

  <div className="relative z-30 text-center">
    <div className="text-sm uppercase tracking-[0.35em] text-zinc-500">
      Mystery Box
    </div>

    {openingPhase !== "reveal" ? (
      <>
        <div className="mt-3 text-3xl font-black">Öffnung läuft...</div>

        <div className="mt-8 flex justify-center">
          <motion.div
            animate={{
              scale: [1, 1.08, 0.98, 1.12, 1],
              rotate: [0, -2, 2, -1, 0],
              y: [0, -6, 0, -10, 0],
            }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`flex h-48 w-48 items-center justify-center rounded-[32px] border border-white/10 bg-black/30 p-5 ${getRarityGlowClasses(openingBox.rarity)}`}
          >
            <motion.img
              src={getSafeItemImagePath(openingBox.slug, openingBox.image_path)}
              alt={openingBox.name}
              className="max-h-full max-w-full object-contain"
              animate={
                openingPhase === "flash"
                  ? { scale: [1, 1.25, 0.75], opacity: [1, 1, 0] }
                  : {}
              }
              transition={{ duration: 0.22 }}
              onError={(e) => {
                e.currentTarget.src = "/items/fallback.png";
              }}
            />
          </motion.div>
        </div>

        <div className="mt-6 text-sm text-zinc-400">
          Die Box wird geöffnet...
        </div>
      </>
    ) : openingReward ? (
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.82, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <div className="mt-3 text-3xl font-black">Du hast erhalten</div>

        <div className="mt-8 flex justify-center">
          <motion.div
            initial={{ scale: 0.88, rotate: -4 }}
            animate={{ scale: [0.9, 1.04, 1], rotate: [0, 2, 0] }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`flex h-56 w-56 items-center justify-center rounded-[34px] border border-white/10 bg-black/30 p-5 ${getRarityGlowClasses(openingReward.rarity)}`}
          >
            <motion.img
  key={`reward-icon-${openingReward.slug}-${insertImpactKey}`}
  src={getSafeItemImagePath(openingReward.slug, openingReward.image_path)}
  alt={openingReward.name}
  className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.65)]"
  initial={{ y: 0, scale: 1 }}
  animate={{ y: [0, -18, 0], scale: [1, 1.04, 1] }}
  transition={{ duration: 0.3, ease: "easeOut" }}
  onError={(e) => {
    e.currentTarget.src = "/items/fallback.png";
  }}
/>
          </motion.div>
        </div>

        <div className="mt-6 text-2xl font-black">{openingReward.name}</div>
        <div className="mt-2 text-sm uppercase tracking-[0.25em] text-zinc-400">
          {openingReward.rarity}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            variant="violet"
            className="min-w-[180px]"
            onClick={() => {
  stopMysteryBoxSounds();
  setOpeningBox(null);
  setOpeningReward(null);
  setOpeningPhase("idle");
}}
          >
            Weiter
          </Button>
        </div>
      </motion.div>
    ) : null}
  </div>
</motion.div>
    </motion.div>
  )}
</AnimatePresence>
        <AnimatePresence>
  {showBetKingModal && activeGroup && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/80 p-4"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-400">Gruppe</div>
            <div className="text-3xl font-black">BET-KING</div>
          </div>

          <button
            onClick={() => setShowBetKingModal(false)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {betKingRows.map((member, index) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="text-lg font-black text-zinc-400">#{index + 1}</div>
                <img
                  src={member.avatar_url || "/default-avatar.png"}
                  alt={member.username}
                  className="h-12 w-12 rounded-full border border-white/10 object-cover"
                />
                <div>
                  <div className="font-bold text-white">{member.username}</div>
                  <div className="text-sm text-zinc-400">
                    {member.user_id === userId ? "Du" : "Gruppenmitglied"}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-zinc-400">Punkte</div>
                <div className="text-2xl font-black text-amber-200">
                  {member.betKingPoints}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={() => setShowGroupPickemModal(true)}
          variant="violet"
          className="mt-5 w-full"
        >
          Pick'em
        </Button>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

<AnimatePresence>
  {showGroupPickemModal && activeGroup && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[97] flex items-center justify-center bg-black/85 p-4"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-400">Gruppe</div>
            <div className="text-3xl font-black">Pick'em</div>
          </div>

          <button
            onClick={() => setShowGroupPickemModal(false)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {activeGroupPickemMatches.map((match) => {
            const myPrediction = getMyGroupPrediction(match.id);
            const pickedUsers = getUsersWhoPredictedMatch(match.id);

            return (
              <div
                key={match.id}
                className="rounded-3xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white">
                      {match.teamA} vs {match.teamB}
                    </div>
                    <div className="text-sm text-zinc-400">
                      {match.startsAt} · {currentMajor.label} · {getDisplayWeek(currentWeek)}
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500">
                    {isMatchLocked(match) ? "Gesperrt" : "Offen"}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={0}
                    disabled={isMatchLocked(match)}
                    value={
                      groupPredictionDrafts[match.id]?.scoreA ??
                      (myPrediction ? String(myPrediction.predicted_score_a) : "")
                    }
                    onChange={(e) =>
                      setGroupPredictionDrafts((prev) => ({
                        ...prev,
                        [match.id]: {
                          scoreA: e.target.value,
                          scoreB:
                            prev[match.id]?.scoreB ??
                            (myPrediction ? String(myPrediction.predicted_score_b) : ""),
                        },
                      }))
                    }
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center outline-none"
                    placeholder={match.teamA}
                  />

                  <input
                    type="number"
                    min={0}
                    disabled={isMatchLocked(match)}
                    value={
                      groupPredictionDrafts[match.id]?.scoreB ??
                      (myPrediction ? String(myPrediction.predicted_score_b) : "")
                    }
                    onChange={(e) =>
                      setGroupPredictionDrafts((prev) => ({
                        ...prev,
                        [match.id]: {
                          scoreA:
                            prev[match.id]?.scoreA ??
                            (myPrediction ? String(myPrediction.predicted_score_a) : ""),
                          scoreB: e.target.value,
                        },
                      }))
                    }
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center outline-none"
                    placeholder={match.teamB}
                  />
                </div>

                <Button
                  onClick={() => saveGroupPrediction(match)}
                  disabled={isMatchLocked(match)}
                  variant="violet"
                  className="mt-3 w-full"
                >
                  Tipp speichern
                </Button>

                <div className="mt-3 text-sm text-zinc-400">
                  Schon getippt:{" "}
                  {pickedUsers.length
                    ? pickedUsers
                        .map((row) => memberNameMap.get(row.user_id) || "User")
                        .join(", ")
                    : "Noch niemand"}
                </div>
              </div>
            );
          })}
        </div>

        <Button
          onClick={() => setShowEvaluatedMatchesModal(true)}
          variant="ghost"
          className="mt-5 w-full"
        >
          Ausgewertet
        </Button>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

<AnimatePresence>
  {showEvaluatedMatchesModal && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[98] flex items-center justify-center bg-black/85 p-4"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-400">Pick'em</div>
            <div className="text-3xl font-black">Ausgewertet</div>
          </div>

          <button
            onClick={() => setShowEvaluatedMatchesModal(false)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {evaluatedGroupPickemMatches.map((match) => {
            const matchPredictions = groupPredictions.filter(
              (row) => row.match_id === match.id
            );

            return (
              <div
                key={match.id}
                className="rounded-3xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-white">
                      {match.teamA} vs {match.teamB}
                    </div>
                    <div className="text-sm text-zinc-400">
                      {match.startsAt} · {match.scoreA}:{match.scoreB}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {findMajorAndWeekLabelForMatch(match.id)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {matchPredictions.map((prediction) => (
                    <div
                      key={prediction.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
                    >
                      <div className="font-semibold text-white">
                        {memberNameMap.get(prediction.user_id) || "User"}
                      </div>

                      <div className="text-sm text-zinc-300">
                        {prediction.predicted_score_a}:{prediction.predicted_score_b}
                      </div>

                      <div className="font-black text-amber-200">
                        +{getGroupPredictionPoints(match, prediction)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      </div>
    </div>
  );
}