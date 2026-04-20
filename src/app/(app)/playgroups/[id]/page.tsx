"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface Invite {
  id: string;
  token: string;
  email: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
  invitedBy: { name: string };
}

export default function PlaygroupDetailPage() {
  const params = useParams();
  const playgroupId = params.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { data: session } = useSession();
  const isAdminUser = (session?.user as { role?: string })?.role === "admin";

  useEffect(() => {
    Promise.all([
      fetch(`/api/playgroups/${playgroupId}/members`).then((r) => r.json()),
      fetch(`/api/playgroups/${playgroupId}/invites`).then((r) => r.json()),
    ])
      .then(([m, i]) => {
        setMembers(Array.isArray(m) ? m : []);
        setInvites(Array.isArray(i) ? i : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [playgroupId]);

  async function handleInviteByEmail() {
    if (!inviteEmail.trim()) return;
    setSending(true);
    setError("");
    const res = await fetch(`/api/playgroups/${playgroupId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setInvites((prev) => [
        { ...data, invitedBy: { name: "You" }, createdAt: new Date().toISOString(), usedAt: null },
        ...prev,
      ]);
      setInviteEmail("");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to send invite");
    }
    setSending(false);
  }

  async function handleGenerateLink() {
    setSending(true);
    setError("");
    const res = await fetch(`/api/playgroups/${playgroupId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const data = await res.json();
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/api/invites/accept?token=${data.token}`);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to generate link");
    }
    setSending(false);
  }

  function copyLink() {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
    }
  }

  async function handleAdminAccept(inviteId: string) {
    const res = await fetch(`/api/playgroups/${playgroupId}/invites`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    });
    if (res.ok) {
      const data = await res.json();
      setInvites((prev) =>
        prev.map((inv) =>
          inv.id === inviteId ? { ...inv, usedAt: new Date().toISOString() } : inv
        )
      );
      // Refresh members
      fetch(`/api/playgroups/${playgroupId}/members`)
        .then((r) => r.json())
        .then((m) => setMembers(Array.isArray(m) ? m : []));
      alert(`${data.userName} has been added to the group.`);
    } else {
      const data = await res.json();
      alert(data.error || "Failed to accept invite");
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">Playgroup</h1>

      {/* Invite Section */}
      <div className="border border-gray-200 rounded-lg bg-white p-4 space-y-4">
        <h2 className="font-semibold text-gray-900">Invite Players</h2>

        {error && (
          <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {/* Invite by email */}
        <div>
          <label className="block text-sm text-gray-500 mb-1">
            Send invite by email
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="friend@example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
            />
            <button
              onClick={handleInviteByEmail}
              disabled={sending || !inviteEmail.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>

        {/* Generate shareable link */}
        <div>
          <label className="block text-sm text-gray-500 mb-1">
            Or generate a shareable link
          </label>
          {inviteLink ? (
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
              />
              <button
                onClick={copyLink}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Copy
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateLink}
              disabled={sending}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Generate Invite Link
            </button>
          )}
          <p className="text-xs text-gray-400 mt-1">Link expires in 7 days</p>
        </div>
      </div>

      {/* Members */}
      <div className="border border-gray-200 rounded-lg bg-white p-4">
        <h2 className="font-semibold text-gray-900 mb-3">
          Members ({members.length})
        </h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <div>
                <span className="text-sm font-medium text-gray-900">
                  {m.user.name}
                </span>
                <span className="text-xs text-gray-400 ml-2">{m.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <h2 className="font-semibold text-gray-900 mb-3">
            Invites
          </h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
              >
                <div>
                  <span className="text-gray-900">
                    {inv.email ?? "Link invite"}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    by {inv.invitedBy.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isAdminUser && !inv.usedAt && inv.email && (
                    <button
                      onClick={() => handleAdminAccept(inv.id)}
                      className="text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700"
                    >
                      Accept
                    </button>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      inv.usedAt
                        ? "bg-green-100 text-green-700"
                        : inv.expiresAt && new Date(inv.expiresAt) < new Date()
                        ? "bg-gray-100 text-gray-500"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {inv.usedAt
                      ? "Accepted"
                      : inv.expiresAt && new Date(inv.expiresAt) < new Date()
                      ? "Expired"
                      : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
