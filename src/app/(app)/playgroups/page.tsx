"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Playgroup {
  id: string;
  name: string;
  description: string | null;
  role: string;
  memberCount: number;
  gameCount: number;
}

export default function PlaygroupsPage() {
  const [playgroups, setPlaygroups] = useState<Playgroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/playgroups")
      .then((r) => r.json())
      .then((data) => {
        setPlaygroups(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-text-tertiary">Loading...</div>;
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">My Playgroups</h1>

      {playgroups.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary">
          You&apos;re not in any playgroups yet.
        </div>
      ) : (
        <div className="space-y-3">
          {playgroups.map((pg) => (
            <Link
              key={pg.id}
              href={`/playgroups/${pg.id}`}
              className="block p-4 rounded-lg border border-border bg-surface hover:border-accent hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-text-primary">{pg.name}</div>
                  {pg.description && (
                    <div className="text-sm text-text-tertiary">{pg.description}</div>
                  )}
                  <div className="text-xs text-text-muted mt-1">
                    {pg.memberCount} members &middot; {pg.gameCount} games
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-surface-sunken text-text-secondary">
                  {pg.role}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
