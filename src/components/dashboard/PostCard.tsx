"use client";

import Image from "next/image";
import { MessageCircle, Heart, Bookmark, Share2, MoreHorizontal } from "lucide-react";

interface PostCardProps {
  authorName: string;
  authorUsername?: string;
  timestamp: string;
  content: string;
  imageUrl?: string;
  communityName?: string;
  likesCount?: number;
  commentsCount?: number;
  bookmarked?: boolean;
  liked?: boolean;
}

export default function PostCard({
  authorName,
  authorUsername,
  timestamp,
  content,
  imageUrl,
  communityName,
  likesCount = 0,
  commentsCount = 0,
  bookmarked = false,
  liked = false,
}: PostCardProps) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-[#111118] p-6 shadow-[0_30px_60px_rgba(0,0,0,.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-500/10 text-lg font-semibold text-white">
            {authorName.charAt(0)}
          </div>
          <div>
            <p className="text-base font-semibold text-white">{authorName}</p>
            <p className="text-sm text-zinc-400">
              @{authorUsername || authorName.toLowerCase().replace(/\s+/g, "")} · {timestamp}
            </p>
          </div>
        </div>
        <button className="rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-300 transition hover:border-red-500/30 hover:text-white">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {communityName ? (
        <div className="mt-5 inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {communityName}
        </div>
      ) : null}

      <p className="mt-5 whitespace-pre-wrap text-lg leading-8 text-zinc-200">{content}</p>

      {imageUrl ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0d0c12]">
          <Image src={imageUrl} alt="Post attachment" width={1200} height={700} className="h-full w-full object-cover" />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 text-sm text-zinc-400">
        <div className="flex items-center gap-5">
          <button className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition ${liked ? "bg-red-500/15 text-red-300" : "bg-white/5 hover:bg-white/10 text-zinc-300"}`}>
            <Heart size={16} className={liked ? "text-red-300" : "text-zinc-300"} />
            {likesCount}
          </button>
          <button className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 text-zinc-300 transition hover:bg-white/10">
            <MessageCircle size={16} />
            {commentsCount}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-2xl bg-white/5 p-3 text-zinc-300 transition hover:bg-white/10">
            <Share2 size={16} />
          </button>
          <button
            className={`rounded-2xl p-3 transition ${bookmarked ? "bg-red-500/15 text-red-300" : "bg-white/5 text-zinc-300 hover:bg-white/10"}`}
            aria-label={bookmarked ? "Remove bookmark" : "Save post"}
          >
            <Bookmark size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
