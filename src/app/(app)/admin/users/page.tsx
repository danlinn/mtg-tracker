"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  _count: { decks: number; gameEntries: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "" });

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  }, []);

  function startEdit(user: AdminUser) {
    setEditing(user.id);
    setEditForm({ name: user.name, email: user.email, role: user.role });
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updated } : u))
      );
      setEditing(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this user and all their data?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-text-tertiary">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <Link href="/admin" className="text-accent hover:underline text-sm">
          Back to Admin
        </Link>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="p-4 rounded-lg border border-border bg-surface"
          >
            {editing === user.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="px-2 py-1 border rounded text-sm bg-surface text-text-primary"
                    placeholder="Name"
                  />
                  <input
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="px-2 py-1 border rounded text-sm bg-surface text-text-primary"
                    placeholder="Email"
                  />
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value })
                    }
                    className="px-2 py-1 border rounded text-sm bg-surface text-text-primary"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(user.id)}
                    className="text-sm bg-accent text-white px-3 py-1 rounded hover:bg-accent-hover"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-sm text-text-tertiary hover:text-text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <Link
                  href={`/admin/users/${user.id}`}
                  className="flex-1 hover:opacity-70 transition-opacity"
                >
                  <div className="font-medium text-text-primary">
                    {user.name}{" "}
                    {user.role === "admin" && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-1">
                        admin
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-text-tertiary">{user.email}</div>
                  <div className="text-xs text-text-muted mt-1">
                    {user._count.decks} decks, {user._count.gameEntries} games
                  </div>
                </Link>
                <div className="flex gap-3 items-center shrink-0">
                  <button
                    onClick={() => startEdit(user)}
                    className="text-accent hover:text-accent-hover text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-danger hover:text-danger text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
