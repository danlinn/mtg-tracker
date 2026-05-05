"use client";
import { useEffect } from "react";
import { init } from "@autotix/sdk/browser";

export function AutotixInit() {
  useEffect(() => {
    init({
      token: process.env.NEXT_PUBLIC_AUTOTIX_TOKEN!,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    });
  }, []);
  return null;
}
