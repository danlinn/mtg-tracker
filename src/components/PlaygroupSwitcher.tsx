"use client";

import { useEffect, useState } from "react";

interface PlaygroupOption {
  id: string;
  name: string;
}

export default function PlaygroupSwitcher() {
  const [playgroups, setPlaygroups] = useState<PlaygroupOption[]>([]);
  const [active, setActive] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/playgroups").then((r) => r.json()),
      fetch("/api/playgroups/active").then((r) => r.json()),
    ])
      .then(([pgData, activeData]) => {
        setPlaygroups(Array.isArray(pgData) ? pgData : []);
        setActive(activeData.playgroupId ?? "all");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSwitch(playgroupId: string) {
    setActive(playgroupId);
    await fetch("/api/playgroups/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playgroupId }),
    });
    window.location.reload();
  }

  if (loading || playgroups.length === 0) return null;

  if (playgroups.length === 1) {
    return (
      <span className="text-xs text-nav-text-muted truncate max-w-[100px]">
        {playgroups[0].name}
      </span>
    );
  }

  return (
    <select
      value={active}
      onChange={(e) => handleSwitch(e.target.value)}
      className="bg-nav-select-bg text-nav-text text-sm rounded px-2 py-1 border border-nav-select-border max-w-[140px]"
    >
      <option value="all">All Groups</option>
      {playgroups.map((pg) => (
        <option key={pg.id} value={pg.id}>
          {pg.name}
        </option>
      ))}
    </select>
  );
}
