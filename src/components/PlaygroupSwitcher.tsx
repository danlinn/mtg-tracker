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
    fetch("/api/playgroups")
      .then((r) => r.json())
      .then((data) => {
        setPlaygroups(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Read current from cookie via a helper endpoint would be needed,
    // but we can also just read from the select default
  }, []);

  async function handleSwitch(playgroupId: string) {
    setActive(playgroupId);
    await fetch("/api/playgroups/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playgroupId }),
    });
    // Refresh the page to re-fetch scoped data
    window.location.reload();
  }

  if (loading || playgroups.length === 0) return null;

  // Only show switcher if user has 1+ playgroups
  if (playgroups.length === 1) {
    return (
      <span className="text-xs text-gray-400 truncate max-w-[100px]">
        {playgroups[0].name}
      </span>
    );
  }

  return (
    <select
      value={active}
      onChange={(e) => handleSwitch(e.target.value)}
      className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1 border border-gray-700 max-w-[140px]"
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
