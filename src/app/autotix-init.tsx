"use client";
import { useEffect } from "react";
import { init } from "@autotix/sdk/browser";

export function AutotixInit() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_AUTOTIX_TOKEN;
    if (!token) return;
    init({
      token,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    });
  }, []);
  return null;
}
