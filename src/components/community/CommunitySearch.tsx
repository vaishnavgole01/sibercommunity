"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { searchCommunities, joinCommunity, fetchUserJoinRequestStatuses } from "@/lib/communities";

type Community = {
  id: string;
  name: string;
  goal: string;
  description?: string | null;
};

export default function CommunitySearch({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestStatuses, setRequestStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await searchCommunities(query);
        if (!mounted) return;
        setResults(res as Community[]);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    const t = setTimeout(run, 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    let mounted = true;
    async function loadStatuses() {
      if (!results.length) {
        setRequestStatuses({});
        return;
      }

      try {
        const statuses = await fetchUserJoinRequestStatuses(results.map((item) => item.id));
        if (mounted) {
          setRequestStatuses(statuses);
        }
      } catch {
        if (mounted) {
          setRequestStatuses({});
        }
      }
    }

    void loadStatuses();

    return () => {
      mounted = false;
    };
  }, [results]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search communities by name, goal or description..."
          className="w-full rounded-full border border-white/10 bg-[#0d0c12] py-3 px-4 text-sm text-white outline-none"
        />
      </div>

      {loading ? <p className="text-sm text-zinc-400">Searching...</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <ul className="space-y-3">
        {results.map((c) => (
          <li key={c.id} className="rounded-lg border border-white/6 p-4 hover:bg-white/5">
            <div className="flex items-center justify-between">
              <div className="cursor-pointer" onClick={() => router.push(`/community/${c.id}`)}>
                <h3 className="text-sm font-semibold text-white">{c.name}</h3>
                <p className="text-xs text-zinc-400">{c.goal}</p>
              </div>
              <div>
                <button
                  className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-400 disabled:bg-zinc-700"
                  disabled={requestStatuses[c.id] === "pending" || requestStatuses[c.id] === "approved"}
                  onClick={async () => {
                    try {
                      await joinCommunity(c.id);
                      alert("Join request sent. Community admins will review and approve.");
                      setRequestStatuses((prev) => ({ ...prev, [c.id]: "pending" }));
                    } catch (error: unknown) {
                      const message = error instanceof Error ? error.message : String(error);
                      alert(message);
                    }
                  }}
                >
                  {requestStatuses[c.id] === "pending"
                    ? "Pending"
                    : requestStatuses[c.id] === "approved"
                    ? "Approved"
                    : "Request"}
                </button>
              </div>
            </div>
            {c.description ? <p className="mt-2 text-sm text-zinc-300">{c.description}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
