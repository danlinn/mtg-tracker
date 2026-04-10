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
          className={`block p-6 rounded-lg border transition-colors ${
            pendingCount > 0
              ? "border-yellow-300 bg-yellow-50 hover:border-yellow-400"
              : "border-gray-200 bg-white hover:border-blue-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
            {pendingCount > 0 && (
              <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                {pendingCount}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {pendingCount > 0
              ? `${pendingCount} user${pendingCount > 1 ? "s" : ""} waiting for approval`
              : "No pending registrations"}
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
