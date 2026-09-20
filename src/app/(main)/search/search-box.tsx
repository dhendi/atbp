"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

const RECENTS_KEY = "atbp_recent_searches";

export function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<{ label: string; type: string }[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  // Recent searches live in localStorage, which isn't available during SSR — this
  // has to run after mount rather than during render.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecents(JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]"));
    } catch {
      setRecents([]);
    }
  }, []);

  useEffect(() => {
    // Suggestions are only ever rendered once value.length >= 2 (see JSX below),
    // so there's nothing to reset here for a short query — just skip fetching.
    if (value.trim().length < 2) return;
    const id = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(value)}`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.suggestions ?? []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(id);
  }, [value]);

  function runSearch(term: string) {
    if (!term.trim()) return;
    const next = [term, ...recents.filter((r) => r !== term)].slice(0, 8);
    setRecents(next);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    setFocused(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function clearRecents() {
    setRecents([]);
    localStorage.removeItem(RECENTS_KEY);
  }

  return (
    <div className="relative">
      <form onSubmit={(e) => { e.preventDefault(); runSearch(value); }} className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input
          autoFocus={!initialQuery}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search products, sellers, or categories"
          className="pl-9"
        />
      </form>

      {focused && (suggestions.length > 0 || (recents.length > 0 && !value)) && (
        <div className="absolute z-10 mt-1.5 w-full rounded-2xl border border-ink-100 bg-white p-2 shadow-lg">
          {value.length >= 2 ? (
            suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => runSearch(s.label)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-ink-50"
              >
                <span className="font-medium text-ink-800">{s.label}</span>
                <span className="text-xs text-ink-400">{s.type}</span>
              </button>
            ))
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-xs font-bold uppercase text-ink-400">Recent</span>
                <button onClick={clearRecents} className="text-xs text-ink-400 hover:text-ink-700">
                  Clear
                </button>
              </div>
              {recents.map((r) => (
                <button
                  key={r}
                  onClick={() => runSearch(r)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                >
                  <Clock size={13} className="text-ink-400" /> {r}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
