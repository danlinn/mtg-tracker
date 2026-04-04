"use client";

import { useState, useEffect, useRef } from "react";

interface CommanderSearchProps {
  value: string;
  onChange: (name: string) => void;
  onCardResolved?: (card: { name: string; image: string | null; colors: string[] } | null) => void;
}

export default function CommanderSearch({ value, onChange, onCardResolved }: CommanderSearchProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(text: string) {
    onChange(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cards?q=${encodeURIComponent(text)}`);
        const data = await res.json();
        setSuggestions(data.data ?? []);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  async function selectSuggestion(name: string) {
    onChange(name);
    setShowDropdown(false);
    setSuggestions([]);

    // Resolve full card data
    if (onCardResolved) {
      try {
        const res = await fetch(`/api/cards?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        onCardResolved(data.card ?? null);
      } catch {
        onCardResolved(null);
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id="commander"
        type="text"
        required
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder="e.g. Krenko, Mob Boss"
        autoComplete="off"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
      />
      {loading && (
        <div className="absolute right-3 top-2.5 text-gray-400 text-xs">
          ...
        </div>
      )}
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => selectSuggestion(name)}
                className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-blue-50 transition-colors"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
