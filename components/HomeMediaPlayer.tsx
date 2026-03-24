"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, PlayCircle, Radio } from "lucide-react";

type MediaItem = {
  id: string;
  label: string;
  kind: "youtube-video" | "youtube-channel-live" | "twitch-channel";
  value: string;
};

const HOME_MEDIA_ITEMS: MediaItem[] = [
  {
    id: "default",
    label: "Standard Video",
    kind: "youtube-video",
    value: "ho4yMYHbPIA",
  },
  {
    id: "cod-video",
    label: "YouTube Video",
    kind: "youtube-video",
    value: "zHEFrEyrLAQ",
  },
  {
    id: "cod-league-live",
    label: "COD League Live",
    kind: "youtube-channel-live",
    value: "CODLeague",
  },
  {
    id: "scump-yt-live",
    label: "Scump YouTube Live",
    kind: "youtube-channel-live",
    value: "Scumpii",
  },
  {
    id: "zoomaa-yt-live",
    label: "ZooMaa YouTube Live",
    kind: "youtube-channel-live",
    value: "ZooMaa",
  },
  {
    id: "scump-twitch-live",
    label: "Scump Twitch Live",
    kind: "twitch-channel",
    value: "scump",
  },
];

function getYoutubeEmbedUrl(item: MediaItem) {
  if (item.kind === "youtube-video") {
    return `https://www.youtube.com/embed/${item.value}?autoplay=0&rel=0&modestbranding=1`;
  }

  if (item.kind === "youtube-channel-live") {
    return `https://www.youtube.com/embed/live_stream?channel=${item.value}&autoplay=0&rel=0`;
  }

  return "";
}

function getTwitchEmbedUrl(channel: string) {
  return `https://player.twitch.tv/?channel=${channel}&parent=pickstar-cdl.vercel.app&autoplay=false`;
}

function HomeMediaPlayer() {
  const [selectedId, setSelectedId] = useState<string>("default");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selectedItem = useMemo(() => {
    return (
      HOME_MEDIA_ITEMS.find((item) => item.id === selectedId) ??
      HOME_MEDIA_ITEMS[0]
    );
  }, [selectedId]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const embedUrl =
    selectedItem.kind === "twitch-channel"
      ? getTwitchEmbedUrl(selectedItem.value)
      : getYoutubeEmbedUrl(selectedItem);

  const isLive =
    selectedItem.kind === "youtube-channel-live" ||
    selectedItem.kind === "twitch-channel";

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-zinc-400">Home</div>
          <div className="text-2xl font-black">Media Window</div>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
            isLive
              ? "border border-red-500/30 bg-red-500/15 text-red-200"
              : "border border-blue-500/30 bg-blue-500/15 text-blue-200"
          }`}
        >
          {isLive ? <Radio className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
          {isLive ? "LIVE / STREAM" : "VIDEO"}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="aspect-video w-full">
          <iframe
            key={selectedItem.id}
            src={embedUrl}
            title={selectedItem.label}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>

      <div ref={wrapperRef} className="relative mt-3">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
        >
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Aktueller Inhalt
            </div>
            <div className="truncate text-sm font-bold text-white">
              {selectedItem.label}
            </div>
          </div>

          <ChevronDown
            className={`h-5 w-5 shrink-0 text-zinc-400 transition ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
            {HOME_MEDIA_ITEMS.map((item) => {
              const active = item.id === selectedItem.id;
              const live =
                item.kind === "youtube-channel-live" ||
                item.kind === "twitch-channel";

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 transition ${
                    active ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {item.label}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {live ? "Livestream" : "YouTube Video"}
                    </div>
                  </div>

                  <div
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                      live
                        ? "bg-red-500/15 text-red-200"
                        : "bg-blue-500/15 text-blue-200"
                    }`}
                  >
                    {live ? "LIVE" : "VIDEO"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default HomeMediaPlayer;