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

const STORAGE_KEY = "call_of_picks_v4_hybrid";

type MatchResult = "A" | "B" | null;
type PickSide = "A" | "B";

type MatchType = {
  id: number;
  week: number;
  teamA: string;
  teamB: string;
  startsAt: string;
  locked: boolean;
  result: MatchResult;
};

type LocalSymbol = {
  id: string;
  slug: string;
  name: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary" | "Ultra";
  image_path: string;
  weight: number;
};

type LocalInventoryItem = LocalSymbol;

type GroupType = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
};

type MemberType = {
  user_id: string;
  username: string;
};

type MemberInventoryItem = {
  inventory_id: string;
  name: string;
  rarity: string;
  image_path: string | null;
  category?: string | null;
};

type MemberInventory = {
  user_id: string;
  username: string;
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

type LocalData = {
  lastDailyClaim?: string | null;
  currentWeek: number;
  currentMajor: string;
  stageLabel: string;
  sourceLabel: string;
  lastSyncLabel: string;
  weeks: Record<number, MatchType[]>;
  picks: Record<number, PickSide>;
  resolvedWeeks: number[];
  tokens: number;
  inventory: LocalInventoryItem[];
  spinHistory: { at: number; reels: string[]; won: boolean }[];
};

type FirstshotRoundState = {
  challengeId: string;
  signalAt: number | null;
  clicked: boolean;
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
  "Atlanta FaZe": "/team-logos/faze.png",
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
  "LA Guerrillas": "/team-logos/lag-logo.png",
};

const allTeams = Object.keys(teamIcons);

const majorStructure = [
  { id: "major1", label: "Major I", weeks: [1, 2, 3] },
  { id: "major2", label: "Major II", weeks: [4, 5, 6] },
  { id: "major3", label: "Major III", weeks: [7, 8, 9] },
  { id: "major4", label: "Major IV", weeks: [10, 11, 12] },
];

const symbolPool: LocalSymbol[] = [
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
    "bg-gradient-to-br from-blue-950/80 to-zinc-950 border-blue-500/40 text-blue-200 shadow-[0_0_25px_rgba(59,130,246,0.18)]",
  Epic:
    "bg-gradient-to-br from-violet-950/80 to-zinc-950 border-violet-500/40 text-violet-200 shadow-[0_0_28px_rgba(139,92,246,0.22)]",
  Legendary:
    "bg-gradient-to-br from-amber-950/80 to-zinc-950 border-amber-500/40 text-amber-200 shadow-[0_0_32px_rgba(245,158,11,0.26)]",
  Ultra:
    "bg-gradient-to-br from-fuchsia-700/30 via-cyan-500/20 to-zinc-950 border-fuchsia-400 text-fuchsia-100 shadow-[0_0_40px_rgba(217,70,239,0.38)]",
};

const defaultData: LocalData = {
  currentWeek: 6,
  currentMajor: "major2",
  stageLabel: "Major II Qualifiers",
  sourceLabel: "Manual weekly input",
  lastSyncLabel: "Manual",
  weeks: {
    5: [
      {
        id: 13181,
        week: 5,
        teamA: "Miami Heretics",
        teamB: "Vancouver Surge",
        startsAt: "Sun 15 Mar · 15:00",
        locked: true,
        result: null,
      },
      {
        id: 13182,
        week: 5,
        teamA: "Riyadh Falcons",
        teamB: "Los Angeles Thieves",
        startsAt: "Sun 15 Mar · 16:30",
        locked: true,
        result: null,
      },
      {
        id: 13183,
        week: 5,
        teamA: "FaZe Vegas",
        teamB: "Carolina Royal Ravens",
        startsAt: "Sun 15 Mar · 18:00",
        locked: true,
        result: "A",
      },
    ],
    6: [
      {
        id: 601,
        week: 6,
        teamA: "FaZe Vegas",
        teamB: "Paris Gentle Mates",
        startsAt: "Fri 20 Mar · 12:00",
        locked: false,
        result: null,
      },
      {
        id: 602,
        week: 6,
        teamA: "Miami Heretics",
        teamB: "Carolina Royal Ravens",
        startsAt: "Sat 21 Mar · 12:00",
        locked: false,
        result: null,
      },
      {
        id: 603,
        week: 6,
        teamA: "FaZe Vegas",
        teamB: "Cloud9 New York",
        startsAt: "Sat 21 Mar · 13:30",
        locked: false,
        result: null,
      },
      {
        id: 604,
        week: 6,
        teamA: "OpTic Texas",
        teamB: "Riyadh Falcons",
        startsAt: "Sat 21 Mar · 15:00",
        locked: false,
        result: null,
      },
      {
        id: 605,
        week: 6,
        teamA: "G2 Minnesota",
        teamB: "Los Angeles Thieves",
        startsAt: "Sat 21 Mar · 16:30",
        locked: false,
        result: null,
      },
      {
        id: 606,
        week: 6,
        teamA: "Riyadh Falcons",
        teamB: "Vancouver Surge",
        startsAt: "Sun 22 Mar · 12:00",
        locked: false,
        result: null,
      },
    ],
  },
  picks: {},
  resolvedWeeks: [],
  tokens: 3,
  inventory: [],
  spinHistory: [],
};

function safeParse(value: string | null): LocalData | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as LocalData;
  } catch {
    return null;
  }
}

function weightedRandom(list: LocalSymbol[]) {
  const total = list.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of list) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return list[list.length - 1];
}

function generateInviteCode() {
  return `COP-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
      className="relative flex h-36 w-24 items-center justify-center overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(180deg,rgba(50,50,56,0.98),rgba(10,10,12,1))] p-3 shadow-[inset_0_2px_12px_rgba(255,255,255,0.08),0_18px_40px_rgba(0,0,0,0.55)]"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-x-2 top-2 h-7 rounded-full bg-white/12 blur-md" />
      <div className="pointer-events-none absolute inset-x-2 bottom-2 h-6 rounded-full bg-black/40 blur-md" />
      <div className="pointer-events-none absolute inset-y-3 left-0 w-px bg-white/15" />
      <div className="pointer-events-none absolute inset-y-3 right-0 w-px bg-white/15" />

      <div className="absolute inset-0 rounded-[28px] ring-1 ring-white/10" />

      <img
        src={symbol.image_path}
        alt={symbol.name}
        className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_16px_28px_rgba(0,0,0,0.6)]"
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
    <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-sm">
      {icon ? (
        <img
          src={icon}
          alt={name}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-xs">🎯</span>
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
  onClick?: () => void;
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
function resolveItemImage(path?: string | null) {
  if (!path || typeof path !== "string") return "/items/fallback.png";
  if (path.startsWith("/")) return path;
  return `/items/${path}`;
}
function normalizeRarity(rarity?: string | null) {
  const value = (rarity || "").trim().toLowerCase();

  if (value === "common") return "Common";
  if (value === "rare") return "Rare";
  if (value === "epic") return "Epic";
  if (value === "legendary") return "Legendary";
  if (value === "ultra") return "Ultra";

  return "Common";
}

function ItemCard({
  item,
  action,
}: {
  item: {
    name: string;
    rarity: string;
    image_path?: string | null;
    category?: string | null;
  };
  action?: React.ReactNode;
}) {
  const normalizedRarity = normalizeRarity(item.rarity);

  let rarityClass = rarityStyles.Common;

  if (normalizedRarity === "Rare") rarityClass = rarityStyles.Rare;
  if (normalizedRarity === "Epic") rarityClass = rarityStyles.Epic;
  if (normalizedRarity === "Legendary") rarityClass = rarityStyles.Legendary;
  if (normalizedRarity === "Ultra") rarityClass = rarityStyles.Ultra;

  return (
    <div className={`rounded-2xl border p-4 ${rarityClass}`}>
      <div className="flex h-24 items-center justify-center rounded-2xl bg-black/20 p-3">
        <img
          src={resolveItemImage(item.image_path)}
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
export default function CallOfPicksPage() {
  const loadAllItems = async () => {
  const { data, error } = await supabase
    .from("items")
    .select("id, slug, name, rarity, image_path, category, weight, is_active")
    .order("name", { ascending: true });

  if (error) {
    setMessage(error.message);
    setAllItemCatalog([]);
    return;
  }

  setAllItemCatalog(data || []);
};
const [allItemCatalog, setAllItemCatalog] = useState<
  {
    id: string;
    slug: string;
    name: string;
    rarity: string;
    image_path: string | null;
    category: string | null;
    weight: number | null;
    is_active: boolean | null;
  }[]
>([]);
const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<
    "home" | "picks" | "slot" | "inventory" | "group" | "admin"
  >("home");

  const [data, setData] = useState<LocalData>(defaultData);

  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState<LocalSymbol[]>([symbolPool[0], symbolPool[1], symbolPool[2]]);
  const [lastWin, setLastWin] = useState<LocalSymbol | null>(null);

  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [needsUsername, setNeedsUsername] = useState(false);

  const [myGroups, setMyGroups] = useState<GroupType[]>([]);
  const [activeGroupId, setActiveGroupId] = useState("");
  const [members, setMembers] = useState<MemberType[]>([]);
  const [memberInventories, setMemberInventories] = useState<MemberInventory[]>([]);

  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const [selectedMember, setSelectedMember] = useState<MemberInventory | null>(null);

  const [challengeTargetItem, setChallengeTargetItem] = useState<MemberInventoryItem | null>(null);
  const [challengeTargetUser, setChallengeTargetUser] = useState<MemberInventory | null>(null);
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
  });

  const updateData = (updater: LocalData | ((prev: LocalData) => LocalData)) => {
    setData((prev) => (typeof updater === "function" ? updater(prev) : updater));
  };

  useEffect(() => {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEY));
    if (parsed) {
      setData({ ...defaultData, ...parsed });
    }
    setMounted(true);
  }, []);

  useEffect(() => {
  loadAllItems();
}, []);
useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, mounted]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const currentWeek = data.currentWeek;
  const weekKeys = useMemo(
    () => Object.keys(data.weeks).map(Number).sort((a, b) => a - b),
    [data.weeks]
  );
  const currentMajor =
    majorStructure.find((major) => major.id === data.currentMajor) || majorStructure[0];
  const visibleWeeks = currentMajor.weeks.filter((week) => weekKeys.includes(week));
  const matches = data.weeks[currentWeek] || [];
  const activeGroup = myGroups.find((g) => g.id === activeGroupId) || null;

  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.username));
    return map;
  }, [members]);

  const inventoryLookup = useMemo(() => {
    const map = new Map<string, { ownerId: string; ownerName: string; item: MemberInventoryItem }>();
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
    const major = majorStructure.find((entry) => entry.weeks.includes(week));
    if (!major) return week;
    return major.weeks.indexOf(week) + 1;
  };

  const correctCount = useMemo(
    () =>
      matches.filter((m) => data.picks[m.id] && m.result && data.picks[m.id] === m.result).length,
    [matches, data.picks]
  );

  const totalPicked = useMemo(
    () => matches.filter((m) => data.picks[m.id]).length,
    [matches, data.picks]
  );

  const resolvedCurrentWeek = data.resolvedWeeks.includes(currentWeek);

  const inventoryCounts = useMemo(() => {
    const map = new Map<string, LocalInventoryItem & { quantity: number }>();
    data.inventory.forEach((item) => {
      const existing = map.get(item.id);
      if (existing) existing.quantity += 1;
      else map.set(item.id, { ...item, quantity: 1 });
    });
    const rarityRank = { Ultra: 5, Legendary: 4, Epic: 3, Rare: 2, Common: 1 };
    return Array.from(map.values()).sort(
      (a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0)
    );
  }, [data.inventory]);

  const topItem = inventoryCounts[0];

  const myOnlineInventory =
    memberInventories.find((entry) => entry.user_id === userId)?.items || [];

  const groupRows = members.map((member) => ({
    ...member,
    tokens: member.user_id === userId ? data.tokens : 0,
    correct: member.user_id === userId ? correctCount : 0,
    top: member.user_id === userId ? topItem?.rarity || "-" : "-",
    isMe: member.user_id === userId,
  }));

  const changeWeek = (week: number) => {
    const major = majorStructure.find((entry) => entry.weeks.includes(week));
    updateData((prev) => ({
      ...prev,
      currentWeek: week,
      currentMajor: major ? major.id : prev.currentMajor,
    }));
  };

  const changeMajor = (majorId: string) => {
    const major = majorStructure.find((entry) => entry.id === majorId);
    const fallbackWeek =
      major?.weeks.find((week) => data.weeks[week]) || major?.weeks[0] || data.currentWeek;
    updateData((prev) => ({
      ...prev,
      currentMajor: majorId,
      currentWeek: fallbackWeek,
    }));
  };

  const setPick = (matchId: number, side: PickSide) => {
    updateData((prev) => ({
      ...prev,
      picks: { ...prev.picks, [matchId]: side },
    }));
  };

  const resolveWeek = () => {
    if (resolvedCurrentWeek || !matches.length) return;

    let earned = 0;
    let allResolved = true;

    matches.forEach((m) => {
  if (!m.result) allResolved = false;
  if (data.picks[m.id] && m.result && data.picks[m.id] === m.result) earned += 5;
});

    if (!allResolved) {
      alert("Setze im Admin-Bereich zuerst alle Ergebnisse dieser Woche.");
      return;
    }

    

    updateData((prev) => ({
      ...prev,
      tokens: prev.tokens + earned,
      resolvedWeeks: [...prev.resolvedWeeks, currentWeek],
    }));

    setScreen("home");
  };

  const addWeek = () => {
    const targetMajor = majorStructure.find((major) => major.id === data.currentMajor);
    if (!targetMajor) return;

    const nextWeek = targetMajor.weeks.find((week) => !data.weeks[week]);
    if (!nextWeek) {
      alert("Dieser Major hat bereits alle 3 Wochen.");
      return;
    }

    updateData((prev) => ({
      ...prev,
      currentWeek: nextWeek,
      weeks: {
        ...prev.weeks,
        [nextWeek]: [],
      },
    }));
  };

  const deleteCurrentWeek = () => {
    if (!confirm(`Willst du Woche ${getDisplayWeek(currentWeek)} in ${currentMajor.label} löschen?`))
      return;

    updateData((prev) => {
      const nextWeeks = { ...prev.weeks };
      delete nextWeeks[currentWeek];
      const fallbackWeek = currentMajor.weeks.find((week) => nextWeeks[week]) || prev.currentWeek;
      return {
        ...prev,
        weeks: nextWeeks,
        currentWeek: fallbackWeek,
      };
    });
  };

  const deleteCurrentMajor = () => {
    if (!confirm(`Willst du ${currentMajor.label} wirklich löschen?`)) return;

    updateData((prev) => {
      const nextWeeks = { ...prev.weeks };
      currentMajor.weeks.forEach((week) => {
        delete nextWeeks[week];
      });

      const fallbackMajor = majorStructure.find(
        (major) => major.id !== currentMajor.id && major.weeks.some((week) => nextWeeks[week])
      );
      const fallbackWeek = fallbackMajor?.weeks.find((week) => nextWeeks[week]) || 1;

      return {
        ...prev,
        weeks: nextWeeks,
        currentMajor: fallbackMajor?.id || prev.currentMajor,
        currentWeek: fallbackWeek,
      };
    });
  };

  const addMatch = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !adminDraft.teamA.trim() ||
      !adminDraft.teamB.trim() ||
      !adminDraft.date.trim() ||
      !adminDraft.startsAt.trim()
    ) {
      return;
    }

    if (adminDraft.teamA === adminDraft.teamB) {
      alert("Bitte zwei unterschiedliche Teams wählen.");
      return;
    }

    const formattedDate = new Date(`${adminDraft.date}T12:00:00`).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const newMatch: MatchType = {
      id: Date.now(),
      week: currentWeek,
      teamA: adminDraft.teamA.trim(),
      teamB: adminDraft.teamB.trim(),
      startsAt: `${formattedDate} · ${adminDraft.startsAt.trim()}`,
      locked: false,
      result: null,
    };

    updateData((prev) => ({
      ...prev,
      weeks: {
        ...prev.weeks,
        [currentWeek]: [...(prev.weeks[currentWeek] || []), newMatch],
      },
    }));

    setAdminDraft({
      teamA: "",
      teamB: "",
      startsAt: "20:00",
      date: getTodayInputValue(),
    });
  };

  const deleteMatch = (matchId: number) => {
    updateData((prev) => ({
      ...prev,
      weeks: {
        ...prev.weeks,
        [currentWeek]: (prev.weeks[currentWeek] || []).filter((m) => m.id !== matchId),
      },
      picks: Object.fromEntries(
        Object.entries(prev.picks).filter(([key]) => Number(key) !== matchId)
      ),
    }));
  };

  const updateMatch = <K extends keyof MatchType>(
    matchId: number,
    field: K,
    value: MatchType[K]
  ) => {
    updateData((prev) => ({
      ...prev,
      weeks: {
        ...prev.weeks,
        [currentWeek]: (prev.weeks[currentWeek] || []).map((m) =>
          m.id === matchId ? { ...m, [field]: value } : m
        ),
      },
    }));
  };

  const resetAll = () => {
    if (!confirm("Willst du wirklich alles zurücksetzen?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setData(defaultData);
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
    a.download = "call-of-picks-save.json";
    a.click();
    URL.revokeObjectURL(url);
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
  };

  const spin = async () => {
    if (data.tokens <= 0 || spinning) return;

    setLastWin(null);
    updateData((prev) => ({ ...prev, tokens: prev.tokens - 1 }));
    setSpinning(true);

    const rolling = setInterval(() => {
      setReels([weightedRandom(symbolPool), weightedRandom(symbolPool), weightedRandom(symbolPool)]);
    }, 100);

    setTimeout(async () => {
      clearInterval(rolling);

      const finalReels = [
        weightedRandom(symbolPool),
        weightedRandom(symbolPool),
        weightedRandom(symbolPool),
      ];
      setReels(finalReels);

      const win = finalReels.every((r) => r.id === finalReels[0].id);
      const spinRecord = {
        at: Date.now(),
        reels: finalReels.map((r) => r.id),
        won: win,
      };

      updateData((prev) => ({
        ...prev,
        inventory: win ? [...prev.inventory, finalReels[0]] : prev.inventory,
        spinHistory: [spinRecord, ...prev.spinHistory].slice(0, 12),
      }));

      if (win) {
        setLastWin(finalReels[0]);
        await grantServerInventoryItem(finalReels[0]);
      }

      setSpinning(false);
    }, 1800);
  };

  const ensureProfile = async (uid: string, email: string) => {
    const { data: existing, error: fetchError } = await supabase
      .from("profiles")
      .select("id, username")
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
      });

      if (insertError) {
        setMessage(insertError.message);
        return;
      }

      setProfileName(fallbackName);
      setNeedsUsername(false);
      return;
    }

    setProfileName(existing.username || "");
    setNeedsUsername(!existing.username);
  };

  const loadGroupInventories = async (groupUserIds: string[]) => {
    if (!groupUserIds.length) {
      setMemberInventories([]);
      return;
    }

    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", groupUserIds);

    if (profileError) {
      setMessage(profileError.message);
      return;
    }

    const { data: invRows, error: invError } = await supabase
      .from("inventory_items")
.select("id, owner_id, items(name, rarity, image_path, category)")
      .in("owner_id", groupUserIds)
      .eq("status", "owned");

    if (invError) {
      setMessage(invError.message);
      return;
    }

    const profileMap = new Map(
      ((profileRows || []) as any[]).map((p) => [p.id, p.username || p.id])
    );

    const grouped = new Map<string, MemberInventory>();

    groupUserIds.forEach((uid) => {
      grouped.set(uid, {
        user_id: uid,
        username: profileMap.get(uid) || uid,
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
      .select("id, username")
      .in("id", memberIds);

    if (profileRowsError) {
      setMessage(profileRowsError.message);
      return;
    }

    const profileMap = new Map(
      (profileRows || []).map((p: any) => [p.id, p.username || p.id])
    );

    const nextMembers = memberIds.map((id: string) => ({
      user_id: id,
      username: profileMap.get(id) || id,
    }));

    setMembers(nextMembers);

    await loadGroupInventories(memberIds);
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const user = session.user;
        setUserId(user.id);
        setUserEmail(user.email || "");
        await ensureProfile(user.id, user.email || "");
        await loadMyGroups(user.id);
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
        await ensureProfile(user.id, user.email || "");
        await loadMyGroups(user.id);
      } else {
        setUserId("");
        setUserEmail("");
        setProfileName("");
        setNeedsUsername(false);
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
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

    const channel = supabase
      .channel(`firstshot-live-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "firstshot_challenges",
        },
        async () => {
          await loadChallenges(userId);
          if (activeGroupId) {
            await loadAllItems();
            await loadGroupDetails(activeGroupId);
            useEffect(() => {
  if (!mounted) return;

  const today = new Date().toISOString().slice(0, 10);

  setData((prev) => {
    if (prev.lastDailyClaim === today) return prev;

    return {
      ...prev,
      tokens: prev.tokens + 2,
      lastDailyClaim: today,
    };
  });
}, [mounted]);
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
        }
      )
      .subscribe();

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

    if (userId) {
      await loadMyGroups(userId);
      if (activeGroupId) await loadGroupDetails(activeGroupId);
    }
  };

  const createGroup = async () => {
    setMessage("");
    if (!userId) return setMessage("Du musst eingeloggt sein.");
    if (!groupName.trim()) return setMessage("Bitte gib einen Gruppennamen ein.");

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

    if (groupError) return setMessage(groupError.message);

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: userId,
    });

    if (memberError) return setMessage(memberError.message);

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

    const { data: groups, error: groupError } = await supabase
      .from("groups")
      .select("*")
      .eq("invite_code", cleanCode)
      .limit(1);

    if (groupError) {
      setMessage(groupError.message);
      return;
    }

    const group = groups?.[0];

    if (!group) {
      setMessage("Gruppe nicht gefunden.");
      return;
    }

    const { data: existingMembership, error: existingError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("group_id", group.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      setMessage(existingError.message);
      return;
    }

    if (existingMembership) {
      setMessage(`Du bist bereits in ${group.name}.`);
      setJoinCode("");
      setActiveGroupId(group.id);
      await loadMyGroups(userId);
      return;
    }

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: userId,
    });

    if (memberError) {
      setMessage(memberError.message);
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
    await loadChallenges(userId);
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

    setRoundFeedback("Nicht zu früh klicken.");
    setRoundUi("waiting");

    const delay = 1200 + Math.floor(Math.random() * 2600);

    setFirstshotRound({
      challengeId: challenge.id,
      signalAt: null,
      clicked: false,
    });

    timeoutRef.current = setTimeout(() => {
      setFirstshotRound((prev) => {
        if (!prev || prev.challengeId !== challenge.id) return prev;
        return { ...prev, signalAt: Date.now() };
      });
      setRoundUi("live");
      setRoundFeedback("JETZT!");
    }, delay);
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

    setFirstshotRound((prev) => (prev ? { ...prev, clicked: true } : prev));

    try {
      if (
        challenge.status === "accepted" &&
        challenge.first_player_id === userId &&
        challenge.first_player_time == null
      ) {
        const { error } = await supabase
          .from("firstshot_challenges")
          .update({
            first_player_time: reactionTime,
            first_player_false_start: falseStart,
            status: "second_turn",
          })
          .eq("id", challenge.id);

        if (error) throw error;

        setRoundUi("saved");
        setRoundFeedback(
          falseStart
            ? "Fehlstart gespeichert. Jetzt ist der Gegner dran."
            : `Deine Zeit wurde gespeichert (${reactionTime} ms). Jetzt ist der Gegner dran.`
        );
      } else if (
  challenge.status === "second_turn" &&
  challenge.second_player_id === userId &&
  challenge.second_player_time == null
) {
  const { error } = await supabase
    .from("firstshot_challenges")
    .update({
      second_player_time: reactionTime,
      second_player_false_start: falseStart,
    })
    .eq("id", challenge.id);

  if (error) throw error;

  const { data: refreshed, error: refreshError } = await supabase
    .from("firstshot_challenges")
    .select("*")
    .eq("id", challenge.id)
    .single();

  if (refreshError || !refreshed) {
    throw new Error(refreshError?.message || "Challenge konnte nicht neu geladen werden.");
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

    const losingItemId =
      winnerId === refreshedChallenge.from_user_id
        ? refreshedChallenge.requested_inventory_item_id
        : refreshedChallenge.offered_inventory_item_id;

    const { error: transferError } = await supabase
      .from("inventory_items")
      .update({ owner_id: winnerId })
      .eq("id", losingItemId);

    if (transferError) {
      throw new Error(`Item-Transfer fehlgeschlagen: ${transferError.message}`);
    }

    const { error: finishError } = await supabase
      .from("firstshot_challenges")
      .update({
        status: "finished",
        winner_user_id: winnerId,
        is_draw: false,
      })
      .eq("id", challenge.id);

    if (finishError) throw finishError;

    setRoundFeedback(
      falseStart
        ? "Fehlstart gespeichert. Ergebnis wurde ausgewertet."
        : `Deine Zeit: ${reactionTime} ms. Ergebnis wurde ausgewertet.`
    );
  }

  await loadChallenges(userId);
  if (activeGroupId) await loadGroupDetails(activeGroupId);

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

      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-gradient-to-b from-zinc-950 via-black to-zinc-950">
        <div className="border-b border-white/10 px-5 pb-4 pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-violet-300/80">
                Call of Picks
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight">Prototype Plus</h1>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
              {data.tokens} Tokens
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
          <AnimatePresence mode="wait">
            {screen === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {!userEmail ? (
                  <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-5 shadow-xl">
                    <div className="text-sm text-zinc-400">Online Funktionen</div>
                    <div className="mt-1 text-2xl font-black">Melde dich mit Google an</div>
                    <div className="mt-2 text-sm text-zinc-400">
                      Dann kannst du Gruppen nutzen und Inventare mit Freunden teilen.
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
                      <div>
                        <div className="text-sm text-zinc-400">Online verbunden</div>
                        <div className="font-bold">{profileName || userEmail}</div>
                        <div className="text-xs text-zinc-500">{userEmail}</div>
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
                      <div className="mt-2 text-sm text-zinc-200">
                        Alte UI bleibt, Gruppen laufen online, Slots sind wieder drin und
                        Challenges sind jetzt komplett spielbar.
                      </div>
                    </div>
                    <Trophy className="mt-1 h-6 w-6 text-violet-200" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-300">
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                      <div className="text-zinc-400">Sync</div>
                      <div className="mt-1 font-semibold">{data.lastSyncLabel}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                      <div className="text-zinc-400">Quelle</div>
                      <div className="mt-1 font-semibold">{data.sourceLabel}</div>
                    </div>
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

                <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-400">Aktiver Major</div>
                        <div className="text-lg font-bold">{currentMajor.label}</div>
                      </div>
                      <div className="text-sm text-zinc-400">
                        Week {getDisplayWeek(currentWeek)}
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
                          key={week}
                          onClick={() => changeWeek(week)}
                          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                            week === currentWeek
                              ? "bg-violet-500 text-white"
                              : "bg-white/5 text-zinc-300"
                          }`}
                        >
                          W{getDisplayWeek(week)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={Coins}
                    label="Tokens"
                    value={data.tokens}
                    glow="border-amber-500/20 bg-gradient-to-br from-zinc-950 to-amber-950/20"
                    sub="Bleiben gespeichert"
                  />
                  <StatCard
                    icon={Target}
                    label="Richtige Picks"
                    value={correctCount}
                    glow="border-cyan-500/20 bg-gradient-to-br from-zinc-950 to-cyan-950/20"
                    sub={`${currentMajor.label} W${getDisplayWeek(currentWeek)}`}
                  />
                  <StatCard
                    icon={Package}
                    label="Inventar"
                    value={data.inventory.length}
                    glow="border-violet-500/20 bg-gradient-to-br from-zinc-950 to-violet-950/20"
                    sub="Lokale Sammlung"
                  />
                  <StatCard
                    icon={Users}
                    label="Gruppen"
                    value={myGroups.length}
                    glow="border-emerald-500/20 bg-gradient-to-br from-zinc-950 to-emerald-950/20"
                    sub={activeGroup ? activeGroup.name : "Keine aktiv"}
                  />
                </div>

                <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-zinc-400">News</div>
                      <div className="text-lg font-bold">Anstehende Matches</div>
                    </div>
                    <CalendarRange className="h-5 w-5 text-violet-300" />
                  </div>

                  <div className="mt-4 space-y-2">
                    {matches.length ? (
                      matches.slice(0, 5).map((match) => (
                        <div
                          key={match.id}
                          className="flex items-center justify-between rounded-2xl bg-black/40 px-3 py-3 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <TeamMini name={match.teamA} />
                            <span>{match.teamA}</span>
                            <span className="text-zinc-500">vs</span>
                            <TeamMini name={match.teamB} />
                            <span>{match.teamB}</span>
                          </div>
                          <span className="text-zinc-400">{match.startsAt}</span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-black/40 px-3 py-3 text-sm text-zinc-400">
                        Keine anstehenden Matches in dieser Woche.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {screen === "picks" && (
              <motion.div
                key="picks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
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
                  {visibleWeeks.map((week) => (
                    <button
                      key={week}
                      onClick={() => changeWeek(week)}
                      className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                        week === currentWeek
                          ? "bg-violet-500 text-white"
                          : "bg-white/5 text-zinc-300"
                      }`}
                    >
                      W{getDisplayWeek(week)}
                    </button>
                  ))}
                </div>

                {matches.map((match) => {
                  const selected = data.picks[match.id];
                  return (
                    <div
                      key={match.id}
                      className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-zinc-400">{match.startsAt}</div>
                        {match.locked ? (
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
                          onClick={() => !match.locked && setPick(match.id, "A")}
                          className={`rounded-2xl border p-4 text-left transition ${
                            selected === "A"
                              ? "border-violet-400 bg-violet-500/20"
                              : "border-white/10 bg-black/40"
                          } ${match.locked ? "opacity-50" : "hover:border-violet-400/60"}`}
                        >
                          <div className="text-xs text-zinc-400">Team A</div>
                          <div className="mt-1 flex items-center gap-2 text-lg font-bold">
                            <TeamMini name={match.teamA} />
                            <span>{match.teamA}</span>
                          </div>
                        </button>

                        <button
                          onClick={() => !match.locked && setPick(match.id, "B")}
                          className={`rounded-2xl border p-4 text-left transition ${
                            selected === "B"
                              ? "border-cyan-400 bg-cyan-500/20"
                              : "border-white/10 bg-black/40"
                          } ${match.locked ? "opacity-50" : "hover:border-cyan-400/60"}`}
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
                  disabled={resolvedCurrentWeek || totalPicked === 0 || !matches.length}
                  className="w-full"
                >
                  {resolvedCurrentWeek ? "Woche bereits ausgewertet" : "Woche auswerten"}
                </Button>
              </motion.div>
            )}

            {screen === "slot" && (
  <motion.div
    key="slot"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-4"
  >
    <SectionTitle eyebrow="Slotmachine" title="Dreh für 1 Token" />

    <div className="relative overflow-hidden rounded-[34px] border border-amber-300/30 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_20%),linear-gradient(180deg,#2a190f_0%,#130d09_20%,#050505_100%)] p-3 shadow-[0_0_120px_rgba(168,85,247,0.22),0_0_60px_rgba(251,191,36,0.14)]">
      {/* Hintergrund-Glow */}
      <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-violet-500/18 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 bottom-8 h-40 w-40 rounded-full bg-fuchsia-500/16 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-20 bg-gradient-to-b from-amber-200/10 to-transparent blur-2xl" />

      {/* obere Leiste */}
      <div className="relative z-10 mb-4 flex items-center justify-between rounded-[24px] border border-white/10 bg-black/30 px-4 py-3 backdrop-blur">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-200/80">
            Premium Slot
          </div>
          <div className="mt-1 text-lg font-black text-white">Jackpot Spin</div>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/70">
            Tokens
          </div>
          <div className="text-lg font-black text-amber-200">{data.tokens}</div>
        </div>
      </div>

      {/* Slot-Körper */}
      <div className="relative z-10 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(34,34,39,0.95),rgba(7,7,9,1))] p-4 shadow-[inset_0_2px_20px_rgba(255,255,255,0.05),inset_0_-20px_30px_rgba(0,0,0,0.35)]">
        {/* Lampen oben */}
        <div className="mb-3 grid grid-cols-6 gap-2">
  {Array.from({ length: 12 }).map((_, i) => (
    <div
      key={i}
      className={`h-3 rounded-full ${
        i % 3 === 0
          ? "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,1)]"
          : i % 3 === 1
          ? "bg-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.95)]"
          : "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.95)]"
      }`}
    />
  ))}
</div>

        {/* Payline */}
        <div className="pointer-events-none absolute left-3 right-3 top-1/2 z-20 h-[3px] -translate-y-1/2 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_16px_rgba(252,211,77,0.8)]" />

        {/* Reels */}
        <div className="relative z-10 rounded-[28px] border border-white/10 bg-black/35 p-3 shadow-inner shadow-black/50">
          <div className="grid grid-cols-3 gap-3 justify-items-center">
            {reels.map((symbol, idx) => (
              <Reel key={idx} symbol={symbol} spinning={spinning} delay={idx * 0.08} />
            ))}
          </div>
        </div>

        {/* untere Statusleiste */}
        <div className="mt-4 rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 text-center">
          <div className="text-[11px] uppercase tracking-[0.28em] text-zinc-400">
            Status
          </div>
          <div className="mt-1 text-base font-black text-white">
            {spinning ? "SPIN LÄUFT..." : "BEREIT FÜR DEN NÄCHSTEN DREH"}
          </div>
        </div>
      </div>

      {/* Button */}
      <Button
        onClick={spin}
        variant="violet"
        disabled={data.tokens <= 0 || spinning}
        className="relative z-10 mt-4 w-full border border-violet-300/20 bg-[linear-gradient(90deg,rgba(139,92,246,1),rgba(217,70,239,1),rgba(168,85,247,1))] py-4 text-base font-black uppercase tracking-[0.18em] shadow-[0_10px_40px_rgba(168,85,247,0.45)]"
      >
        {spinning ? "Dreht..." : "Spin starten"}
      </Button>
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
                src={lastWin.image_path || "/items/fallback.png"}
                alt={lastWin.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div>
              <div className="text-xl font-black">Treffer! {lastWin.name}</div>
              <div className="mt-1 text-sm opacity-90">
                Zum Inventar hinzugefügt
                {userEmail ? " · auch online gespeichert" : ""}
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
              <span className={spinItem.won ? "text-emerald-300" : "text-zinc-400"}>
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

            {screen === "inventory" && (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <SectionTitle eyebrow="Deine Sammlung" title="Inventar" />

                {inventoryCounts.length === 0 ? (
                  <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-6 text-center text-zinc-400 shadow-xl">
                    Noch keine Items. Gewinne eins in der Slotmachine.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
  {inventoryCounts.map((item) => (
    <ItemCard
      key={item.id}
      item={item}
      action={<div className="text-sm">x{item.quantity}</div>}
    />
  ))}
</div>
                )}

                {!!userEmail && (
  <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
    <div className="text-lg font-bold">Online-Inventar</div>

    <div className="mt-3">
      {myOnlineInventory.length ? (
        <div className="grid grid-cols-2 gap-3">
          {myOnlineInventory.map((item) => (
  <ItemCard
    key={item.inventory_id}
    item={{
      name: item.name,
      rarity: normalizeRarity(item.rarity),
      image_path: item.image_path,
      category: item.category,
    }}
  />
))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-zinc-500">
          Noch keine online gespeicherten Items.
        </div>
      )}
    </div>
  </div>
)}
              </motion.div>
            )}

            {screen === "group" && (
              <motion.div
                key="group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
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
                    <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl">
                      <div className="text-lg font-bold">Profil</div>
                      <div className="mt-2 text-sm text-zinc-400">E-Mail</div>
                      <div className="font-semibold">{userEmail}</div>

                      <div className="mt-3 text-sm text-zinc-400">Anzeigename</div>
                      <input
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Neuer Anzeigename"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
                      />
                      <Button onClick={saveDisplayName} className="mt-3 w-full">
                        Anzeigename speichern
                      </Button>
                      {needsUsername ? (
                        <div className="mt-2 text-xs text-amber-300">
                          Bitte vergib einen Anzeigenamen.
                        </div>
                      ) : null}
                    </div>

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
                                <div className="text-xs text-zinc-500">
                                  {group.invite_code}
                                </div>
                              </div>
                              <div className="text-xs text-zinc-400">
                                {group.owner_id === userId ? "Owner" : "Mitglied"}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-zinc-500">
                          Noch keine Gruppen.
                        </div>
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
                                Rolle:{" "}
                                {activeGroup.owner_id === userId ? "Besitzer" : "Mitglied"}
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
                                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-sm font-bold">
                                    #{index + 1}
                                  </div>
                                  <div>
                                    <div className="font-bold">
                                      {member.username}
                                      {member.isMe ? " (Du)" : ""}
                                    </div>
                                    <div className="text-sm text-zinc-400">
                                      {member.correct} richtige Tipps
                                    </div>
                                  </div>
                                </button>

                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <div className="font-bold text-amber-200">
                                      {member.tokens} Tokens
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                      {member.top !== "-" ? member.top : "Kein Showcase"}
                                    </div>
                                  </div>

                                  {activeGroup.owner_id === userId &&
                                  member.user_id !== userId ? (
                                    <button
                                      onClick={() => removeMemberFromGroup(member.user_id)}
                                      className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-200"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))}
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
      rarity: getInventoryMeta(challenge.offered_inventory_item_id)?.item.rarity || "Common",
      image_path: meta.offeredImage,
    }}
  />
  <span className="text-zinc-500 text-center">↔</span>
  <ItemCard
    item={{
      name: meta.requestedName,
      rarity: getInventoryMeta(challenge.requested_inventory_item_id)?.item.rarity || "Common",
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

                          {allChallenges.length ? (
                            allChallenges.map((challenge) => {
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
                                    <div>
                                      <div className="text-sm text-zinc-400">
                                        {meta.fromName} vs {meta.toName}
                                      </div>
                                      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
  <ItemCard
    item={{
      name: meta.offeredName,
      rarity: getInventoryMeta(challenge.offered_inventory_item_id)?.item.rarity || "Common",
      image_path: meta.offeredImage,
    }}
  />
  <span className="text-zinc-500 text-center">↔</span>
  <ItemCard
    item={{
      name: meta.requestedName,
      rarity: getInventoryMeta(challenge.requested_inventory_item_id)?.item.rarity || "Common",
      image_path: meta.requestedImage,
    }}
  />
</div>

<div className="mt-2 text-xs text-zinc-500">
  {challenge.is_draw
    ? "Unentschieden"
    : getChallengeStatusLabel(challenge.status)}
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
                              Keine Challenges vorhanden.
                            </div>
                          )}
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
                className="space-y-4"
              >
                <SectionTitle
                  eyebrow="Verwaltung"
                  title="Admin-Bereich"
                  right={<Settings2 className="h-5 w-5 text-violet-300" />}
                />

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
                          key={week}
                          onClick={() => changeWeek(week)}
                          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                            week === currentWeek
                              ? "bg-violet-500 text-white"
                              : "bg-white/5 text-zinc-300"
                          }`}
                        >
                          W{getDisplayWeek(week)}
                        </button>
                      ))}
                      <button
                        onClick={addWeek}
                        className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200"
                      >
                        + Woche
                      </button>
                      <button
                        onClick={deleteCurrentWeek}
                        className="rounded-xl bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-200"
                      >
                        Woche löschen
                      </button>
                      <button
                        onClick={deleteCurrentMajor}
                        className="rounded-xl bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-200"
                      >
                        Major löschen
                      </button>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={addMatch}
                  className="space-y-4 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-4 shadow-xl"
                >
                  <div className="text-lg font-bold">Match hinzufügen</div>

                  <div>
                    <div className="mb-2 text-sm text-zinc-400">Team A</div>
                    <div className="grid grid-cols-2 gap-2">
                      {allTeams.map((team) => (
                        <button
                          key={`A-${team}`}
                          type="button"
                          onClick={() =>
                            setAdminDraft((prev) => ({ ...prev, teamA: team }))
                          }
                          className={`rounded-2xl border px-3 py-3 text-left text-sm ${
                            adminDraft.teamA === team
                              ? "border-violet-400 bg-violet-500/20"
                              : "border-white/10 bg-black/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <TeamMini name={team} />
                            <span>{team}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm text-zinc-400">Team B</div>
                    <div className="grid grid-cols-2 gap-2">
                      {allTeams.map((team) => (
                        <button
                          key={`B-${team}`}
                          type="button"
                          onClick={() =>
                            setAdminDraft((prev) => ({ ...prev, teamB: team }))
                          }
                          className={`rounded-2xl border px-3 py-3 text-left text-sm ${
                            adminDraft.teamB === team
                              ? "border-cyan-400 bg-cyan-500/20"
                              : "border-white/10 bg-black/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <TeamMini name={team} />
                            <span>{team}</span>
                          </div>
                        </button>
                      ))}
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

                <div className="space-y-3">
                  {(data.weeks[currentWeek] || []).map((match) => (
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

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          value={match.teamA}
                          onChange={(e) =>
                            updateMatch(match.id, "teamA", e.target.value)
                          }
                          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
                        />
                        <input
                          value={match.teamB}
                          onChange={(e) =>
                            updateMatch(match.id, "teamB", e.target.value)
                          }
                          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
                        />
                      </div>

                      <input
                        value={match.startsAt}
                        onChange={(e) =>
                          updateMatch(match.id, "startsAt", e.target.value)
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => updateMatch(match.id, "locked", !match.locked)}
                          variant="ghost"
                          className="w-full"
                        >
                          {match.locked ? "Entsperren" : "Sperren"}
                        </Button>

                        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/40 p-1">
                          <button
                            type="button"
                            onClick={() => updateMatch(match.id, "result", null)}
                            className={`rounded-xl py-2 text-sm ${
                              match.result === null
                                ? "bg-white text-black"
                                : "text-zinc-300"
                            }`}
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMatch(match.id, "result", "A")}
                            className={`rounded-xl py-2 text-sm ${
                              match.result === "A"
                                ? "bg-violet-500 text-white"
                                : "text-zinc-300"
                            }`}
                          >
                            A
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMatch(match.id, "result", "B")}
                            className={`rounded-xl py-2 text-sm ${
                              match.result === "B"
                                ? "bg-cyan-500 text-white"
                                : "text-zinc-300"
                            }`}
                          >
                            B
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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

                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Hybrid-Version aktiv
                  </div>
                  <div className="mt-2 text-emerald-50/90">
                    Alte UI und Slotmachine bleiben lokal, Login, Gruppen,
                    Inventar-Popup, Challenges und News laufen zusammen.
                  </div>
                  <div className="space-y-3">
  <div className="text-lg font-bold">Alle Items</div>

  {allItemCatalog.length ? (
    <div className="grid grid-cols-2 gap-3">
      {allItemCatalog.map((item) => (
        <ItemCard
          key={item.id}
          item={{
            name: item.name,
            rarity: item.rarity,
            image_path: item.image_path,
            category: item.category,
          }}
        />
      ))}
    </div>
  ) : (
    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-500">
      Keine Items gefunden.
    </div>
  )}
</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {message ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
              {message}
            </div>
          ) : null}
        </div>

        <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-md border-t border-white/10 bg-black/85 px-3 py-3 backdrop-blur">
          <div className="grid grid-cols-6 gap-2">
            {[
              { id: "home", label: "Home", icon: Trophy },
              { id: "picks", label: "Picks", icon: Target },
              { id: "slot", label: "Slot", icon: Zap },
              { id: "inventory", label: "Inventar", icon: Package },
              { id: "group", label: "Gruppe", icon: Users },
              { id: "admin", label: "Admin", icon: Shield },
            ].map((item) => {
              const Icon = item.icon;
              const active = screen === (item.id as typeof screen);
              return (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id as typeof screen)}
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
                  <div>
                    <div className="text-sm text-zinc-400">Inventar</div>
                    <div className="text-2xl font-black">{selectedMember.username}</div>
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
          action={
            selectedMember.user_id !== userId ? (
              <button
                onClick={() => {
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
          {selectedChallengeFresh && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-zinc-400">FirstShot</div>
                    <div className="text-2xl font-black">
                      {memberNameMap.get(selectedChallengeFresh.from_user_id) || "Spieler"} vs{" "}
                      {memberNameMap.get(selectedChallengeFresh.to_user_id) || "Spieler"}
                    </div>
                  </div>
                  <button
                    onClick={closeChallengeModal}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="text-sm text-zinc-400">Status</div>
                  <div className="mt-1 font-semibold">
                    {selectedChallengeFresh.is_draw
                      ? "Unentschieden"
                      : getChallengeStatusLabel(selectedChallengeFresh.status)}
                  </div>

                  <div className="mt-3 text-sm text-zinc-400">Items</div>
                  <div className="mt-2 text-sm">
                    {getInventoryMeta(selectedChallengeFresh.offered_inventory_item_id)?.item
                      .name || "Unbekannt"}{" "}
                    ↔{" "}
                    {getInventoryMeta(
                      selectedChallengeFresh.requested_inventory_item_id
                    )?.item.name || "Unbekannt"}
                  </div>
                </div>

                {roundUi === "pending" && (
                  <div className="mt-4 rounded-3xl border border-white/10 bg-black/40 p-6 text-center">
                    <div className="text-3xl font-black">PENDING</div>
                    <div className="mt-2 text-sm text-zinc-400">
                      Die Challenge wartet noch auf Annahme.
                    </div>
                  </div>
                )}

                {roundUi === "ready" && (
                  <div className="mt-4 rounded-3xl border border-white/10 bg-black/40 p-6 text-center">
                    <div className="text-3xl font-black">DU BIST DRAN</div>
                    <div className="mt-2 text-sm text-zinc-400">
                      Warte auf das Signal und klicke dann sofort. Zu frühes
                      Klicken zählt als Fehlstart.
                    </div>
                    <Button
                      onClick={() => beginFirstshotRound(selectedChallengeFresh)}
                      className="mt-4 w-full"
                    >
                      FirstShot starten
                    </Button>
                  </div>
                )}

                {(roundUi === "waiting" || roundUi === "live") && (
                  <button
                    onClick={submitReaction}
                    className={`mt-4 flex h-72 w-full items-center justify-center rounded-[28px] border text-center transition duration-150 ${
                      roundUi === "live"
                        ? "border-red-500/60 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.35),rgba(69,10,10,0.9))] shadow-[0_0_60px_rgba(239,68,68,0.28)]"
                        : "border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.95),rgba(10,10,10,1))]"
                    }`}
                  >
                    <div>
                      <div className="text-6xl font-black tracking-[0.08em]">
                        {roundUi === "live" ? "SHOT!" : "WARTEN..."}
                      </div>
                      <div className="mt-3 text-base text-zinc-300">
                        {roundFeedback}
                      </div>
                      <div className="mt-4 text-xs uppercase tracking-[0.25em] text-zinc-500">
                        Tippe auf diese Fläche
                      </div>
                    </div>
                  </button>
                )}

                {roundUi === "saved" && (
                  <div className="mt-4 rounded-3xl border border-white/10 bg-black/40 p-6 text-center">
                    <div className="text-3xl font-black">GESPEICHERT</div>
                    <div className="mt-2 text-sm text-zinc-400">
                      {roundFeedback || "Dein Versuch wurde gespeichert."}
                    </div>
                  </div>
                )}

                {roundUi === "watch" && (
                  <div className="mt-4 rounded-3xl border border-white/10 bg-black/40 p-6 text-center">
                    <div className="text-3xl font-black">WARTE</div>
                    <div className="mt-2 text-sm text-zinc-400">
                      Der andere Spieler ist zuerst dran.
                    </div>
                  </div>
                )}

                {roundUi === "finished" && (
                  <div className="mt-4 rounded-3xl border border-white/10 bg-black/40 p-6">
                    <div className="text-center">
                      <div className="text-3xl font-black">
  {selectedChallengeFresh.status === "declined"
    ? "ABGELEHNT"
    : selectedChallengeFresh.is_draw
      ? "UNENTSCHIEDEN"
      : selectedChallengeFresh.winner_user_id === userId
        ? "DU HAST GEWONNEN"
        : "DU HAST VERLOREN"}
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

                    <div className="mt-4 grid gap-2">
                      <div className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm">
                        <strong>
                          {memberNameMap.get(
                            selectedChallengeFresh.first_player_id || ""
                          ) || "Spieler 1"}
                          :
                        </strong>{" "}
                        {selectedChallengeFresh.first_player_time === 999999
                          ? "Fehlstart"
                          : selectedChallengeFresh.first_player_time ?? "-"}{" "}
                        {selectedChallengeFresh.first_player_time &&
                        selectedChallengeFresh.first_player_time !== 999999
                          ? "ms"
                          : ""}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm">
                        <strong>
                          {memberNameMap.get(
                            selectedChallengeFresh.second_player_id || ""
                          ) || "Spieler 2"}
                          :
                        </strong>{" "}
                        {selectedChallengeFresh.second_player_time === 999999
                          ? "Fehlstart"
                          : selectedChallengeFresh.second_player_time ?? "-"}{" "}
                        {selectedChallengeFresh.second_player_time &&
                        selectedChallengeFresh.second_player_time !== 999999
                          ? "ms"
                          : ""}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm">
                        <strong>Ergebnis:</strong>{" "}
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
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}