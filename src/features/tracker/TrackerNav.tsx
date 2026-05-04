import Link from "next/link";
import { signOut } from "next-auth/react";
import type { ThemeName } from "@/lib/theme";
import PlaygroupSwitcher from "@/components/PlaygroupSwitcher";

interface TrackerNavProps {
  showNav: boolean;
  setShowNav: (v: boolean) => void;
  theme: ThemeName;
  setTheme: (v: ThemeName) => void;
}

export function TrackerNav({ showNav, setShowNav, theme, setTheme }: TrackerNavProps) {
  return (
    <>
      {/* Pull-down nav trigger */}
      {!showNav && (
        <div
          className="absolute top-0 left-0 right-0 h-8 z-50"
          onTouchStart={() => setShowNav(true)}
          onClick={() => setShowNav(true)}
        >
          <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mt-3" />
        </div>
      )}

      {/* Nav overlay */}
      {showNav && (
        <div className="absolute inset-0 z-50 flex flex-col">
          <div className="bg-nav-bg/95 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="nav-logo font-bold text-lg text-nav-text-hover">MTG Tracker</span>
              <button
                type="button"
                onClick={() => setShowNav(false)}
                className="text-nav-text-muted hover:text-nav-text-hover p-2"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 pb-3 space-y-1 border-t border-nav-border">
              {[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/decks", label: "Decks" },
                { href: "/games", label: "Games" },
                { href: "/players", label: "Players" },
                { href: "/stats", label: "Stats" },
                { href: "/leaderboard", label: "Leaderboard" },
                { href: "/playgroups", label: "Groups" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded text-sm font-medium text-nav-text hover:text-nav-text-hover hover:bg-nav-hover-bg"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 pt-2 border-t border-nav-border space-y-1">
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-nav-text-muted">Group</span>
                  <PlaygroupSwitcher />
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-nav-text-muted">Theme</span>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as ThemeName)}
                    className="bg-nav-select-bg text-nav-text text-sm rounded px-2 py-1 border border-nav-select-border"
                  >
                    {(["default","synth","cyber","flame","chris","phyrexia","stained-glass","dungeon","neon-dynasty","grixis"] as const).map((v) => (
                      <option key={v} value={v}>{v === "stained-glass" ? "Stained Glass" : v === "neon-dynasty" ? "Neon Dynasty" : v.charAt(0).toUpperCase() + v.slice(1)}</option>
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
                  className="block w-full text-left px-3 py-2 text-sm text-nav-text-muted hover:text-nav-text-hover"
                >
                  Reload App
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="block w-full text-left px-3 py-2 text-sm text-nav-text-muted hover:text-nav-text-hover"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setShowNav(false)} />
        </div>
      )}
    </>
  );
}
