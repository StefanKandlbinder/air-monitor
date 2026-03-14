"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
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
import {
  usePlaceSearchQuery,
  type NominatimResult,
} from "@/components/station-map/queries/use-place-search-query";
import type { GroupedParameters } from "@/components/station-map/types";
import { FilterPopover } from "@/components/station-map/FilterPopover";
import { useDictionary } from "@/components/providers/DictionaryProvider";

export type PlaceSelection = {
  lat: number;
  lon: number;
  label: string;
};

type LocationSearchProps = {
  onSelectPlace: (place: PlaceSelection) => void;
  selectedLabel?: string | null;
  groupedParameters: GroupedParameters;
  selectedParameters: string[];
  onToggleParameter: (parameter: string) => void;
  onClearParameters: () => void;
};

export function LocationSearch({
  onSelectPlace,
  selectedLabel = null,
  groupedParameters,
  selectedParameters,
  onToggleParameter,
  onClearParameters,
}: LocationSearchProps) {
  const dict = useDictionary();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
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
  const { data: results = [], isFetching } =
    usePlaceSearchQuery(debouncedQuery);

  const handleSelect = useCallback(
    (result: NominatimResult) => {
      const label = result.display_name.split(",").slice(0, 2).join(", ");
      setSearchOpen(false);
      setQuery("");
      setDebouncedQuery("");
      onSelectPlace({
        lat: Number(result.lat),
        lon: Number(result.lon),
        label,
      });
    },
    [onSelectPlace],
  );

  const handleSubmit = () => {
    if (query.trim().length < 2) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDebouncedQuery(query);
    if (results.length > 0) handleSelect(results[0]);
  };

  return (
    <Popover
      open={searchOpen && isQueryActive && (isFetching || results.length > 0)}
      onOpenChange={setSearchOpen}
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
              if (e.target.value.trim().length >= 2) setSearchOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
                return;
              }
              if (!searchOpen || !isQueryActive || results.length === 0) return;
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                commandRef.current?.dispatchEvent(
                  new KeyboardEvent("keydown", {
                    key: e.key,
                    bubbles: true,
                    cancelable: true,
                  }),
                );
              } else if (e.key === "Tab") {
                const highlighted = commandRef.current?.querySelector(
                  '[aria-selected="true"]',
                );
                if (!highlighted) {
                  e.preventDefault();
                  commandRef.current?.dispatchEvent(
                    new KeyboardEvent("keydown", {
                      key: "ArrowDown",
                      bubbles: true,
                      cancelable: true,
                    }),
                  );
                }
              }
            }}
            placeholder={selectedLabel ?? dict.locationSearch.placeholder}
          />
          <InputGroupAddon className="mr-0 pr-1.5" align="inline-end">
            <FilterPopover
              groupedParameters={groupedParameters}
              selectedParameters={selectedParameters}
              onToggleParameter={onToggleParameter}
              onClear={onClearParameters}
            />
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
              <CommandEmpty>{dict.locationSearch.searching}</CommandEmpty>
            ) : results.length === 0 ? (
              <CommandEmpty>{dict.locationSearch.noPlacesFound}</CommandEmpty>
            ) : (
              <CommandGroup heading={dict.locationSearch.places}>
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
