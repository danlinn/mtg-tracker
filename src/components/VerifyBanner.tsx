"use client";

import { useEffect, useState } from "react";

export default function VerifyBanner() {
  const [show, setShow] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/theme")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.emailVerified === false) {
          setShow(true);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function handleResend() {
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/resend-verification", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? "Failed to send");
      } else {
        setSent(true);
      }
    } catch {
      setSendError("Network error");
    }
    setSending(false);
  }

  if (!show) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center text-sm text-yellow-800">
      Please check your email and verify your account.
      {sent ? (
        <span className="ml-2 text-success font-medium">Sent!</span>
      ) : sendError ? (
        <span className="ml-2 text-danger font-medium">{sendError}</span>
      ) : (
        <button
          onClick={handleResend}
          disabled={sending}
          className="ml-2 underline hover:text-yellow-900 disabled:opacity-50"
        >
          {sending ? "Sending..." : "Resend email"}
        </button>
      )}
    </div>
  );
}
