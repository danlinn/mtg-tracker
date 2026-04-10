"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PlayerCountStat {
  games: number;
  wins: number;
  winRate: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  games: number;
  wins: number;
  winRate: number;
  niceWins: number;
  bigWins: number;
  easyWins: number;
  winRateByPlayerCount: Record<number, PlayerCountStat>;
}

type PlayerCountFilter = "all" | "2" | "3" | "4";

function getFilteredStats(entry: LeaderboardEntry, filter: PlayerCountFilter) {
  if (filter === "all") {
    return { games: entry.games, wins: entry.wins, winRate: entry.winRate };
  }
  const stat = entry.winRateByPlayerCount[Number(filter)];
  if (!stat) return { games: 0, wins: 0, winRate: 0 };
  return stat;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [playerCountFilter, setPlayerCountFilter] = useState<PlayerCountFilter>("all");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/leaderboard?page=${page}&perPage=${perPage}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setEntries(data.entries);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, perPage]);

  const sorted = [...entries].sort((a, b) => {
    if (playerCountFilter === "all") {
      return b.winRate - a.winRate || b.wins - a.wins;
    }
    const aStats = getFilteredStats(a, playerCountFilter);
    const bStats = getFilteredStats(b, playerCountFilter);
    return bStats.winRate - aStats.winRate || bStats.wins - aStats.wins;
  });

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <div className="flex gap-1">
          {(["all", "2", "3", "4"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPlayerCountFilter(f)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                playerCountFilter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "All" : `${f}p`}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No games recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry, index) => {
            const filtered = getFilteredStats(entry, playerCountFilter);
            if (playerCountFilter !== "all" && filtered.games === 0) return null;
            return (
              <Link
                key={entry.id}
                href={`/players/${entry.id}`}
                className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    (page - 1) * perPage + index === 0
                      ? "bg-yellow-400 text-yellow-900"
                      : (page - 1) * perPage + index === 1
                      ? "bg-gray-300 text-gray-700"
                      : (page - 1) * perPage + index === 2
                      ? "bg-orange-300 text-orange-800"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {(page - 1) * perPage + index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{entry.name}</div>
                  <div className="text-sm text-gray-500">
                    {filtered.games} games played
                  </div>
                  {(entry.niceWins > 0 || entry.bigWins > 0 || entry.easyWins > 0) && playerCountFilter === "all" && (
                    <div className="flex gap-2 mt-1">
                      {entry.bigWins > 0 && (
                        <span className="text-xs font-bold text-yellow-500">{entry.bigWins} Big</span>
                      )}
                      {entry.niceWins > 0 && (
                        <span className="text-xs font-bold text-blue-500">{entry.niceWins} Nice</span>
                      )}
                      {entry.easyWins > 0 && (
                        <span className="text-xs text-gray-400">{entry.easyWins} Easy</span>
                      )}
                    </div>
                  )}
                  {/* Per-player-count breakdown */}
                  {playerCountFilter === "all" && (
                    <div className="flex gap-3 mt-2 pt-2 border-t border-gray-100">
                      {([2, 3, 4] as const).map((count) => {
                        const stat = entry.winRateByPlayerCount[count];
                        return (
                          <div key={count} className="flex-1 text-center text-xs">
                            <div className="text-gray-400">{count}p</div>
                            {stat ? (
                              <div className="font-semibold text-gray-700">
                                {stat.winRate}%{" "}
                                <span className="text-gray-400 font-normal">
                                  ({stat.wins}/{stat.games})
                                </span>
                              </div>
                            ) : (
                              <div className="text-gray-300">&mdash;</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-gray-900">
                    {filtered.wins}W - {filtered.games - filtered.wins}L
                  </div>
                  <div className="text-sm text-gray-500">
                    {filtered.winRate}% win rate
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Per page:</span>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-900"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-400">{total} players</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-sm rounded-lg border border-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              Prev
            </button>
            <span className="text-sm text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm rounded-lg border border-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
