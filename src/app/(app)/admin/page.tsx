import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
