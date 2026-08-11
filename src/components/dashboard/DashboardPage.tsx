"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import TopHeader from "@/components/dashboard/TopHeader";
import PostCard from "@/components/dashboard/PostCard";
import StoriesSection from "@/components/dashboard/StoriesSection";
import TrendingCommunities from "@/components/dashboard/TrendingCommunities";
import WhoToFollow from "@/components/dashboard/WhoToFollow";
import { fetchHomePosts } from "@/lib/dashboard";

interface HomePost {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  author_name?: string;
  community_name?: string;
  likes_count?: number;
  comments_count?: number;
}

export default function DashboardPage() {
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHome() {
      try {
        setLoading(true);
        const homePosts = await fetchHomePosts();
        setPosts(homePosts);
      } catch (err: any) {
        setError(err?.message || "Unable to load posts.");
      } finally {
        setLoading(false);
      }
    }

    loadHome();
  }, []);

  return (
    <div className="min-h-screen bg-[#09080c] text-white">
      <div className="mx-auto grid max-w-[1700px] gap-8 px-6 py-10 xl:grid-cols-[320px_minmax(640px,1fr)_360px]">
        <Sidebar />

        <main className="space-y-8">
          <TopHeader />

          <StoriesSection />

          <section className="grid gap-6">
            {loading ? (
              <div className="rounded-[32px] border border-white/10 bg-[#111118] p-10 text-center text-zinc-400">Loading posts...</div>
            ) : error ? (
              <div className="rounded-[32px] border border-red-500/20 bg-[#330000] p-10 text-center text-red-200">{error}</div>
            ) : posts.length === 0 ? (
              <div className="rounded-[32px] border border-white/10 bg-[#111118] p-10 text-center text-zinc-400">No posts yet. Join a community and start sharing.</div>
            ) : (
              posts.map((post) => {
                const authorName = post.author_name || "Siber Member";
                return (
                  <PostCard
                    key={post.id}
                    authorName={authorName}
                    authorUsername={authorName
                      .toLowerCase()
                      .replace(/\s+/g, "")
                      .slice(0, 12)}
                    timestamp={new Date(post.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    content={post.content}
                    imageUrl={post.image_url}
                    communityName={post.community_name}
                    likesCount={post.likes_count}
                    commentsCount={post.comments_count}
                  />
                );
              })
            )}
          </section>
        </main>

        <aside className="space-y-6 xl:block">
          <TrendingCommunities />
          <WhoToFollow />
        </aside>
      </div>
    </div>
  );
}
