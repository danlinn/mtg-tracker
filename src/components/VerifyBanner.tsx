"use client";

import { useEffect, useState } from "react";

export default function VerifyBanner() {
  const [show, setShow] = useState(false);

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

  if (!show) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center text-sm text-yellow-800">
      Please check your email and verify your account.
    </div>
  );
}
