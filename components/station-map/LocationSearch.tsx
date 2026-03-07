"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
};

export type PlaceSelection = {
  lat: number;
  lon: number;
  label: string;
};

type LocationSearchProps = {
  onSelectPlace: (place: PlaceSelection) => void;
  isLoadingStations?: boolean;
};

export function LocationSearch({
  onSelectPlace,
  isLoadingStations = false,
}: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", query);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "6");
        const res = await fetch(url.toString(), {
          headers: { "Accept-Language": "en" },
        });
        const data = (await res.json()) as NominatimResult[];
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = useCallback(
    (result: NominatimResult) => {
      setOpen(false);
      setQuery("");
      setResults([]);
      onSelectPlace({
        lat: Number(result.lat),
        lon: Number(result.lon),
        label: result.display_name.split(",").slice(0, 2).join(", "),
      });
    },
    [onSelectPlace],
  );

  const handleSubmit = async () => {
    if (query.trim().length < 2) return;
    if (results.length > 0) {
      handleSelect(results[0]);
      return;
    }
    // Fetch immediately if debounce hasn't resolved yet
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      const res = await fetch(url.toString(), {
        headers: { "Accept-Language": "en" },
      });
      const data = (await res.json()) as NominatimResult[];
      if (data[0]) handleSelect(data[0]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover
      open={open && (loading || results.length > 0 || query.trim().length > 1)}
      onOpenChange={setOpen}
    >
      <PopoverAnchor asChild>
        <InputGroup className="w-64">
          <InputGroupAddon align="inline-start">
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length > 1) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmit();
            }}
            placeholder="Search any location…"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="sm"
              variant="ghost"
              disabled={query.trim().length < 2 || loading || isLoadingStations}
              onClick={() => void handleSubmit()}
            >
              {isLoadingStations ? "Loading…" : loading ? "…" : "Search"}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </PopoverAnchor>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {loading ? (
              <CommandEmpty>Searching…</CommandEmpty>
            ) : results.length === 0 ? (
              <CommandEmpty>No places found.</CommandEmpty>
            ) : (
              <CommandGroup heading="Places">
                {results.map((result) => (
                  <CommandItem
                    key={result.place_id}
                    value={String(result.place_id)}
                    onSelect={() => handleSelect(result)}
                  >
                    {result.display_name.split(",").slice(0, 3).join(", ")}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
