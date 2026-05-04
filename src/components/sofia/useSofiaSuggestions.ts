import { useEffect, useState } from "react";
import type { SofiaSuggestion } from "./SofiaSuggestionCard";

export function useSofiaSuggestions(screen: string, entityId?: string | null) {
  const [suggestions, setSuggestions] = useState<SofiaSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ screen });
    if (entityId) params.set("entityId", entityId);
    fetch(`/api/sofia/suggestions?${params.toString()}`)
      .then((r) => r.json())
      .then((d: { suggestions: SofiaSuggestion[] }) => {
        if (!cancelled) setSuggestions(d.suggestions || []);
      })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [screen, entityId]);

  return { suggestions, loading };
}