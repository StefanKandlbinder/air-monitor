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
import { usePlaceSearchQuery, type NominatimResult } from "@/components/station-map/queries/use-place-search-query";

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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) return;
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const isQueryActive = query.trim().length >= 2;
  const { data: results = [], isFetching } = usePlaceSearchQuery(debouncedQuery);

  const handleSelect = useCallback(
    (result: NominatimResult) => {
      setOpen(false);
      setQuery("");
      setDebouncedQuery("");
      onSelectPlace({
        lat: Number(result.lat),
        lon: Number(result.lon),
        label: result.display_name.split(",").slice(0, 2).join(", "),
      });
    },
    [onSelectPlace],
  );

  const handleSubmit = () => {
    if (query.trim().length < 2) return;
    // Flush debounce immediately so the query fires now
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDebouncedQuery(query);
    if (results.length > 0) handleSelect(results[0]);
  };

  return (
    <Popover
      open={open && isQueryActive && (isFetching || results.length > 0)}
      onOpenChange={setOpen}
    >
      <PopoverAnchor asChild>
        <InputGroup className="h-8 w-64">
          <InputGroupAddon align="inline-start">
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length >= 2) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { handleSubmit(); return; }
              if (!open || !isQueryActive || results.length === 0) return;
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                commandRef.current?.dispatchEvent(
                  new KeyboardEvent("keydown", { key: e.key, bubbles: true, cancelable: true })
                );
              } else if (e.key === "Tab") {
                const highlighted = commandRef.current?.querySelector('[aria-selected="true"]');
                if (!highlighted) {
                  // Nothing highlighted yet — move into the list
                  e.preventDefault();
                  commandRef.current?.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })
                  );
                }
                // Item already highlighted — let Tab close the popover and move focus naturally
              }
            }}
            placeholder="Search any location…"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="sm"
              variant="ghost"
              disabled={query.trim().length < 2 || isFetching || isLoadingStations}
              onClick={handleSubmit}
            >
              {isLoadingStations ? "Loading…" : isFetching ? "…" : "Search"}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </PopoverAnchor>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command ref={commandRef} shouldFilter={false}>
          <CommandList>
            {isFetching ? (
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
