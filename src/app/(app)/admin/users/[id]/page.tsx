"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ColorPips from "@/components/ColorPips";

interface Deck {
  id: string;
  name: string;
  commander: string;
  colorW: boolean;
  colorU: boolean;
  colorB: boolean;
  colorR: boolean;
  colorG: boolean;
  bracket: number | null;
  edhp: number | null;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  decks: Deck[];
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}/decks`)
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  async function handleDeleteDeck(deckId: string) {
    if (!confirm("Delete this deck?")) return;
    const res = await fetch(`/api/admin/decks/${deckId}`, { method: "DELETE" });
    if (res.ok && user) {
      setUser({ ...user, decks: user.decks.filter((d) => d.id !== deckId) });
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">User not found</p>
        <Link href="/admin/users" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/users" className="text-blue-600 hover:underline text-sm">
            &larr; Users
          </Link>
          <h1 className="text-2xl font-bold mt-1">
            {user.name}
            {user.role === "admin" && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-2 align-middle">
                admin
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Decks ({user.decks.length})</h2>
        <Link
          href={`/admin/users/${userId}/decks/new`}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Add Deck
        </Link>
      </div>

      {user.decks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No decks yet.</div>
      ) : (
        <div className="space-y-2">
          {user.decks.map((deck) => (
            <div
              key={deck.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white"
            >
              <div className="space-y-1">
                <div className="font-medium text-gray-900">{deck.name}</div>
                <div className="text-sm text-gray-500">{deck.commander}</div>
                <div className="flex items-center gap-2">
                  <ColorPips
                    colors={{
                      W: deck.colorW,
                      U: deck.colorU,
                      B: deck.colorB,
                      R: deck.colorR,
                      G: deck.colorG,
                    }}
                  />
                  {(deck.bracket != null || deck.edhp != null) && (
                    <span className="text-xs text-gray-400">
                      {deck.edhp != null ? `p:${deck.edhp.toFixed(2)}` : ""}
                      {deck.edhp != null && deck.bracket != null ? " " : ""}
                      {deck.bracket != null ? `b:${deck.bracket}` : ""}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDeleteDeck(deck.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
