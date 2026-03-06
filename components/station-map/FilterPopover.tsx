"use client";

import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { GroupedComponents } from "@/components/station-map/types";

type FilterPopoverProps = {
  groupedComponents: GroupedComponents;
  selectedComponents: string[];
  onToggleComponent: (component: string) => void;
  onClear: () => void;
};

function ComponentSection({
  title,
  components,
  selectedComponents,
  onToggleComponent,
}: {
  title: string;
  components: string[];
  selectedComponents: string[];
  onToggleComponent: (component: string) => void;
}) {
  if (!components.length) {
    return null;
  }

  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {components.map((component) => {
          const selected = selectedComponents.includes(component);
          return (
            <Button
              key={component}
              variant={selected ? "default" : "outline"}
              size="sm"
              type="button"
              className="h-7 px-2 text-[11px]"
              onClick={() => onToggleComponent(component)}
            >
              {component}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterPopover({
  groupedComponents,
  selectedComponents,
  onToggleComponent,
  onClear,
}: FilterPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Filter className="mr-1 h-3.5 w-3.5" />
          Components
          {selectedComponents.length ? (
            <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px]">
              {selectedComponents.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Filter stations by component
          </p>
          {selectedComponents.length ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onClear}
              className="h-7 px-2 text-xs"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
        <div className="max-h-56 space-y-3 overflow-auto pr-1">
          <ComponentSection
            title="Air quality"
            components={groupedComponents.airQuality}
            selectedComponents={selectedComponents}
            onToggleComponent={onToggleComponent}
          />
          <ComponentSection
            title="Light"
            components={groupedComponents.light}
            selectedComponents={selectedComponents}
            onToggleComponent={onToggleComponent}
          />
          <ComponentSection
            title="Wind"
            components={groupedComponents.wind}
            selectedComponents={selectedComponents}
            onToggleComponent={onToggleComponent}
          />
          <ComponentSection
            title="Other"
            components={groupedComponents.other}
            selectedComponents={selectedComponents}
            onToggleComponent={onToggleComponent}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
