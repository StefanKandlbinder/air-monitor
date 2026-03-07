"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DateRangePickerProps = {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearDateRange: () => void;
};

function getDatePart(iso: string): string {
  return iso.slice(0, 10);
}

function getTimePart(iso: string, fallback: string): string {
  return iso.length >= 16 ? iso.slice(11, 16) : fallback;
}

function combineDateAndTime(date: Date, time: string): string {
  return `${format(date, "yyyy-MM-dd")}T${time}`;
}

function isoToDate(iso: string): Date | undefined {
  return iso ? parseISO(getDatePart(iso)) : undefined;
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClearDateRange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const [draftFrom, setDraftFrom] = useState<Date | undefined>(() => isoToDate(dateFrom));
  const [draftTo, setDraftTo] = useState<Date | undefined>(() => isoToDate(dateTo));
  const [draftFromTime, setDraftFromTime] = useState(() => getTimePart(dateFrom, "00:00"));
  const [draftToTime, setDraftToTime] = useState(() => getTimePart(dateTo, "23:59"));

  // Sync draft state when popover opens
  useEffect(() => {
    if (open) {
      setDraftFrom(isoToDate(dateFrom));
      setDraftTo(isoToDate(dateTo));
      setDraftFromTime(getTimePart(dateFrom, "00:00"));
      setDraftToTime(getTimePart(dateTo, "23:59"));
    }
  }, [open]);

  const handleRangeSelect = (next: DateRange | undefined): void => {
    setDraftFrom(next?.from);
    setDraftTo(next?.to);
  };

  const handleApply = (): void => {
    if (draftFrom) onDateFromChange(combineDateAndTime(draftFrom, draftFromTime));
    if (draftTo) onDateToChange(combineDateAndTime(draftTo, draftToTime));
    setOpen(false);
  };

  const handleReset = (): void => {
    onClearDateRange();
    setOpen(false);
  };

  const committedFromDate = isoToDate(dateFrom);
  const committedToDate = isoToDate(dateTo);
  const committedFromTime = getTimePart(dateFrom, "00:00");
  const committedToTime = getTimePart(dateTo, "23:59");

  const label =
    committedFromDate && committedToDate
      ? `${format(committedFromDate, "MMM d, yyyy")} ${committedFromTime} – ${format(committedToDate, "MMM d, yyyy")} ${committedToTime}`
      : committedFromDate
        ? `${format(committedFromDate, "MMM d, yyyy")} ${committedFromTime} – …`
        : "Select date range";

  const canApply = !!draftFrom && !!draftTo;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          type="button"
          className="w-fit justify-start font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from: draftFrom, to: draftTo }}
          onSelect={handleRangeSelect}
          numberOfMonths={2}
        />
        <div className="grid grid-cols-2 gap-3 border-t p-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Start time</label>
            <input
              type="time"
              value={draftFromTime}
              onChange={(e) => setDraftFromTime(e.target.value)}
              disabled={!draftFrom}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">End time</label>
            <input
              type="time"
              value={draftToTime}
              onChange={(e) => setDraftToTime(e.target.value)}
              disabled={!draftTo}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
            />
          </div>
        </div>
        <div className="flex gap-2 border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="flex-1 text-xs"
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            size="sm"
            type="button"
            className="flex-1 text-xs"
            onClick={handleApply}
            disabled={!canApply}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
