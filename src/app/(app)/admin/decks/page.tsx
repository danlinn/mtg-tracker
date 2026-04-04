"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ColorPips from "@/components/ColorPips";

interface AdminDeck {
  id: string;
  name: string;
  commander: string;
  colorW: boolean;
  colorU: boolean;
  colorB: boolean;
  colorR: boolean;
  colorG: boolean;
  user: { id: string; name: string; email: string };
}

export default function AdminDecksPage() {
  const [decks, setDecks] = useState<AdminDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", commander: "" });

  useEffect(() => {
    fetch("/api/admin/decks")
      .then((r) => r.json())
      .then((data) => {
        setDecks(data);
        setLoading(false);
      });
  }, []);

  function startEdit(deck: AdminDeck) {
    setEditing(deck.id);
    setEditForm({ name: deck.name, commander: deck.commander });
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/admin/decks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setDecks((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updated } : d))
      );
      setEditing(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this deck?")) return;
    const res = await fetch(`/api/admin/decks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDecks((prev) => prev.filter((d) => d.id !== id));
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Decks</h1>
        <Link href="/admin" className="text-blue-600 hover:underline text-sm">
          Back to Admin
        </Link>
      </div>

      <div className="space-y-2">
        {decks.map((deck) => (
          <div
            key={deck.id}
            className="p-4 rounded-lg border border-gray-200 bg-white"
          >
            {editing === deck.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="px-2 py-1 border rounded text-sm bg-white text-gray-900"
                    placeholder="Deck Name"
                  />
                  <input
                    value={editForm.commander}
                    onChange={(e) =>
                      setEditForm({ ...editForm, commander: e.target.value })
                    }
                    className="px-2 py-1 border rounded text-sm bg-white text-gray-900"
                    placeholder="Commander"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(deck.id)}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium text-gray-900">{deck.name}</div>
                  <div className="text-sm text-gray-500">{deck.commander}</div>
                  <ColorPips
                    colors={{
                      W: deck.colorW,
                      U: deck.colorU,
                      B: deck.colorB,
                      R: deck.colorR,
                      G: deck.colorG,
                    }}
                  />
                  <div className="text-xs text-gray-400">
                    Owner: {deck.user.name} ({deck.user.email})
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => startEdit(deck)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(deck.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {decks.length === 0 && (
          <div className="text-center py-12 text-gray-500">No decks found.</div>
        )}
      </div>
    </div>
  );
}
