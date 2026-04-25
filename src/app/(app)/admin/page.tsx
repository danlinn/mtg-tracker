"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/pending-count")
      .then((r) => r.json())
      .then((data) => setPendingCount(data.count ?? 0))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/pending"
          className="block p-6 rounded-lg border border-gray-200 bg-white hover:border-blue-400 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Pending Approvals
            {pendingCount > 0 && (
              <span className="ml-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full align-middle">
                {pendingCount}
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Approve or reject new user registrations
          </p>
        </Link>
        <Link
          href="/admin/playgroups"
          className="block p-6 rounded-lg border border-gray-200 bg-white hover:border-blue-400 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">Playgroups</h2>
          <p className="text-sm text-gray-500 mt-1">
            Create, manage, and assign members to playgroups
          </p>
        </Link>
        <Link
          href="/admin/users"
          className="block p-6 rounded-lg border border-gray-200 bg-white hover:border-blue-400 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500 mt-1">
            View, edit, and delete user accounts
          </p>
        </Link>
        <Link
          href="/admin/games"
          className="block p-6 rounded-lg border border-gray-200 bg-white hover:border-blue-400 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">Games</h2>
          <p className="text-sm text-gray-500 mt-1">
            Reassign games to playgroups, bulk fix unassigned games
          </p>
        </Link>
        <Link
          href="/admin/decks"
          className="block p-6 rounded-lg border border-gray-200 bg-white hover:border-blue-400 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">Decks</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage all decks across users
          </p>
        </Link>
      </div>
    </div>
  );
}
