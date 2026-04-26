"use client";

import { useEffect, useState } from "react";

interface Playgroup {
  id: string;
  name: string;
  description: string | null;
  _count: { members: number; games: number };
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Member {
  id: string;
  role: string;
  user: User;
}

export default function AdminPlaygroupsPage() {
  const [playgroups, setPlaygroups] = useState<Playgroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [addUserId, setAddUserId] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/playgroups").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ]).then(([pg, u]) => {
      setPlaygroups(pg);
      setUsers(u);
      setLoading(false);
    });
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/playgroups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    if (res.ok) {
      const pg = await res.json();
      setPlaygroups((prev) => [...prev, { ...pg, _count: { members: 0, games: 0 } }]);
      setNewName("");
      setNewDesc("");
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this playgroup? Games will lose their playgroup association.")) return;
    const res = await fetch(`/api/admin/playgroups/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPlaygroups((prev) => prev.filter((p) => p.id !== id));
    }
  }

  async function loadMembers(playgroupId: string) {
    if (expandedId === playgroupId) {
      setExpandedId(null);
      return;
    }
    const res = await fetch(`/api/playgroups/${playgroupId}/members`);
    if (res.ok) {
      setMembers(await res.json());
      setExpandedId(playgroupId);
    }
  }

  async function handleAddMember(playgroupId: string) {
    if (!addUserId) return;
    await fetch(`/api/admin/playgroups/${playgroupId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", userId: addUserId }),
    });
    setAddUserId("");
    loadMembers(playgroupId);
  }

  async function handleRemoveMember(playgroupId: string, userId: string) {
    await fetch(`/api/admin/playgroups/${playgroupId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", userId }),
    });
    loadMembers(playgroupId);
  }

  async function handleSetRole(playgroupId: string, userId: string, role: string) {
    await fetch(`/api/admin/playgroups/${playgroupId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setRole", userId, role }),
    });
    loadMembers(playgroupId);
  }

  if (loading) return <div className="text-center py-12 text-text-tertiary">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Manage Playgroups</h1>

      {/* Create playgroup */}
      <div className="p-4 border border-border rounded-lg bg-surface space-y-3">
        <h2 className="font-semibold text-text-primary">Create Playgroup</h2>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Playgroup name"
          className="w-full px-3 py-2 border border-border-strong rounded-lg bg-surface text-text-primary text-sm"
        />
        <input
          type="text"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Description (optional)"
          className="w-full px-3 py-2 border border-border-strong rounded-lg bg-surface text-text-primary text-sm"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="btn-primary bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {creating ? "Creating..." : "Create"}
        </button>
      </div>

      {/* Playgroup list */}
      <div className="space-y-3">
        {playgroups.map((pg) => (
          <div key={pg.id} className="border border-border rounded-lg bg-surface">
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-text-primary">{pg.name}</div>
                {pg.description && (
                  <div className="text-sm text-text-tertiary">{pg.description}</div>
                )}
                <div className="text-xs text-text-muted mt-1">
                  {pg._count.members} members &middot; {pg._count.games} games
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => loadMembers(pg.id)}
                  className="text-xs px-3 py-1 rounded bg-surface-sunken text-text-secondary hover:bg-surface-hover transition-colors"
                >
                  {expandedId === pg.id ? "Hide" : "Members"}
                </button>
                <button
                  onClick={() => handleDelete(pg.id)}
                  className="text-xs px-3 py-1 rounded bg-danger-bg text-danger hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            {expandedId === pg.id && (
              <div className="border-t border-border p-4 space-y-3">
                {/* Add member */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    className="w-full sm:flex-1 px-3 py-2 border border-border-strong rounded-lg bg-surface text-text-primary text-sm min-w-0"
                  >
                    <option value="">Add member...</option>
                    {users
                      .filter((u) => !members.some((m) => m.user.id === u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => handleAddMember(pg.id)}
                    disabled={!addUserId}
                    className="btn-primary bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 shrink-0"
                  >
                    Add
                  </button>
                </div>

                {/* Member list */}
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 bg-surface-raised rounded"
                  >
                    <div>
                      <span className="text-sm font-medium text-text-primary">
                        {m.user.name}
                      </span>
                      <span className="text-xs text-text-muted ml-2">
                        {m.role}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={m.role}
                        onChange={(e) =>
                          handleSetRole(pg.id, m.user.id, e.target.value)
                        }
                        className="text-xs border border-border-strong rounded px-2 py-1 bg-surface text-text-primary"
                      >
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(pg.id, m.user.id)}
                        className="text-xs text-danger hover:text-danger"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="text-sm text-text-muted text-center">
                    No members yet
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
