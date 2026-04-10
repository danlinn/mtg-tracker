"use client";

import { useEffect, useState } from "react";

interface PendingUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface Playgroup {
  id: string;
  name: string;
}

export default function AdminPendingPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [playgroups, setPlaygroups] = useState<Playgroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPgs, setSelectedPgs] = useState<Record<string, string[]>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/playgroups").then((r) => r.json()),
    ]).then(([users, pgs]) => {
      setPendingUsers(users.filter((u: { status: string }) => u.status === "pending"));
      setPlaygroups(pgs);
      setLoading(false);
    });
  }, []);

  function togglePg(userId: string, pgId: string) {
    setSelectedPgs((prev) => {
      const current = prev[userId] ?? [];
      return {
        ...prev,
        [userId]: current.includes(pgId)
          ? current.filter((id) => id !== pgId)
          : [...current, pgId],
      };
    });
  }

  async function handleAction(userId: string, action: "approve" | "reject") {
    const res = await fetch("/api/admin/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        action,
        playgroupIds: selectedPgs[userId] ?? [],
      }),
    });
    if (res.ok) {
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pending Approvals</h1>

      {pendingUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No pending users.
        </div>
      ) : (
        <div className="space-y-3">
          {pendingUsers.map((user) => (
            <div
              key={user.id}
              className="p-4 border border-gray-200 rounded-lg bg-white space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  <div className="text-xs text-gray-400">
                    Registered {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Playgroup assignment */}
              {playgroups.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">
                    Assign to playgroups:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {playgroups.map((pg) => {
                      const selected = (selectedPgs[user.id] ?? []).includes(
                        pg.id
                      );
                      return (
                        <button
                          key={pg.id}
                          onClick={() => togglePg(user.id, pg.id)}
                          className={`text-xs px-3 py-1 rounded-full transition-colors ${
                            selected
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {pg.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(user.id, "approve")}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction(user.id, "reject")}
                  className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
