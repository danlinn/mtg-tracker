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
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  function handleInputChange(text: string) {
    onChange(text);
    setActiveIndex(-1);

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
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  }

  async function selectSuggestion(name: string) {
    onChange(name);
    setShowDropdown(false);
    setSuggestions([]);
    setActiveIndex(-1);

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
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder="e.g. Krenko, Mob Boss"
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-activedescendant={activeIndex >= 0 ? `commander-option-${activeIndex}` : undefined}
        className="w-full px-3 py-2 border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-surface text-text-primary"
      />
      {loading && (
        <div className="absolute right-3 top-2.5 text-text-muted text-xs">
          ...
        </div>
      )}
      {showDropdown && suggestions.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((name, index) => (
            <li
              key={name}
              id={`commander-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                onClick={() => selectSuggestion(name)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full text-left px-3 py-2 text-sm text-text-primary transition-colors ${
                  index === activeIndex ? "bg-blue-50" : "hover:bg-blue-50"
                }`}
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
