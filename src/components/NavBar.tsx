"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useTheme, ThemeName } from "@/lib/theme";
import PlaygroupSwitcher from "@/components/PlaygroupSwitcher";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tracker", label: "Game Tracker" },
  { href: "/decks", label: "Decks" },
  { href: "/games", label: "Games" },
  { href: "/players", label: "Players" },
  { href: "/stats", label: "Stats" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/playgroups", label: "Groups" },
];

const themeLabels: Record<ThemeName, string> = {
  default: "Default",
  synth: "Synth",
  cyber: "Cyber",
  flame: "Flame",
  chris: "Chris",
  phyrexia: "Phyrexia",
  "stained-glass": "Stained Glass",
  dungeon: "Dungeon",
  "neon-dynasty": "Neon Dynasty",
  grixis: "Grixis",
};

export default function NavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;

  const allNavItems = userRole === "admin"
    ? [...navItems, { href: "/admin", label: "Admin" }]
    : navItems;

  // Breakpoint: lg (1024px). Below that → hamburger. Pure CSS — no JS
  // measurement — so the nav can never ping-pong between states.
  //
  // On /tracker, we drop the sticky behavior on desktop so the tracker
  // can use the full viewport without the nav eating 104px of vertical
  // space. Mobile stays sticky (nav is only 56px there).
  const isTracker = pathname === "/tracker";
  const navPositionClass = isTracker ? "sticky top-0 lg:static" : "sticky top-0";

  return (
    <nav className={`bg-gray-900 text-white z-50 relative ${navPositionClass}`}>
      <div className="w-full px-4">
        {/* Top row */}
        <div className="flex items-center justify-between h-14 gap-4">
          <Link href="/dashboard" className="font-bold text-lg whitespace-nowrap">
            MTG Tracker
          </Link>

          {/* Desktop-only right side (≥ lg) */}
          <div className="hidden lg:flex items-center gap-4 whitespace-nowrap">
            <PlaygroupSwitcher />
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeName)}
              className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1 border border-gray-700"
            >
              {Object.entries(themeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-gray-400 hover:text-white text-sm"
            >
              Sign out
            </button>
          </div>

          {/* Mobile hamburger (< lg) */}
          <button
            data-testid="mobile-menu-toggle"
            className="lg:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Desktop menu row (≥ lg) */}
        <div className="hidden lg:flex items-center gap-1 whitespace-nowrap border-t border-gray-800 h-12 overflow-x-auto">
          {allNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors shrink-0 ${
                pathname === item.href
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:text-white hover:bg-gray-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Mobile menu: absolute on tracker (overlays fixed content), in-flow elsewhere */}
        {menuOpen && (
          <div
            data-testid="mobile-menu"
            className={`mtg-mobile-menu lg:hidden pb-3 pt-2 space-y-1 border-t-2 border-gray-500 ${
              isTracker ? "absolute left-0 right-0 top-full z-50 rounded-b-lg shadow-2xl shadow-black/80" : ""
            }`}
            style={{ background: "inherit" }}
          >
            {allNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded text-sm font-medium ${
                  pathname === item.href
                    ? "bg-gray-700 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-sm text-gray-400">Group</span>
              <PlaygroupSwitcher />
            </div>
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-sm text-gray-400">Theme</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeName)}
                className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1 border border-gray-700"
              >
                {Object.entries(themeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                if ("caches" in window) {
                  caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
                }
                window.location.reload();
              }}
              className="block w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white"
            >
              Reload App
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="block w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
