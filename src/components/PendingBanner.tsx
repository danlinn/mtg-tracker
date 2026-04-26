"use client";

import { useSession } from "next-auth/react";

export default function PendingBanner() {
  const { data: session } = useSession();
  const status = (session?.user as { status?: string })?.status;

  if (!status || status === "approved") return null;

  if (status === "pending") {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-center text-sm text-yellow-800">
        Your account is pending admin approval. You&apos;ll be notified by email once approved.
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="bg-danger-bg border-b border-red-200 px-4 py-3 text-center text-sm text-red-800">
        Your account has been rejected. Please contact an admin for more information.
      </div>
    );
  }

  return null;
}
