import { X } from "lucide-react";
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

function formatLocalDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDatePart(value: string): string {
  return value.slice(0, 10);
}

function getTimePart(value: string, fallback: string): string {
  return value.length >= 16 ? value.slice(11, 16) : fallback;
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClearDateRange,
}: DateRangePickerProps) {
  const selectedFromDate = dateFrom
    ? new Date(`${getDatePart(dateFrom)}T00:00`)
    : undefined;
  const selectedToDate = dateTo
    ? new Date(`${getDatePart(dateTo)}T00:00`)
    : undefined;

  const handleFromDateSelect = (date: Date | undefined): void => {
    if (!date) {
      onDateFromChange("");
      return;
    }
    const fromDate = formatLocalDateOnly(date);
    const currentFromTime = getTimePart(dateFrom, "00:00");
    onDateFromChange(`${fromDate}T${currentFromTime}`);
  };

  const handleToDateSelect = (date: Date | undefined): void => {
    if (!date) {
      onDateToChange("");
      return;
    }
    const toDate = formatLocalDateOnly(date);
    const currentToTime = getTimePart(dateTo, "23:59");
    onDateToChange(`${toDate}T${currentToTime}`);
  };

  const handleFromTimeChange = (time: string): void => {
    if (!dateFrom) return;
    onDateFromChange(`${getDatePart(dateFrom)}T${time}`);
  };

  const handleToTimeChange = (time: string): void => {
    if (!dateTo) return;
    onDateToChange(`${getDatePart(dateTo)}T${time}`);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="w-fit shrink-0 justify-start"
          >
            {dateFrom
              ? `Start: ${dateFrom.replace("T", " ")}`
              : "Select start date/time"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedFromDate}
            onSelect={handleFromDateSelect}
          />
          <div className="space-y-1 border-t p-3">
            <label className="text-xs text-muted-foreground">Start time</label>
            <input
              type="time"
              value={getTimePart(dateFrom, "00:00")}
              onChange={(event) => handleFromTimeChange(event.target.value)}
              disabled={!dateFrom}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
              aria-label="Start time"
            />
          </div>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="w-fit shrink-0 justify-start"
          >
            {dateTo
              ? `End: ${dateTo.replace("T", " ")}`
              : "Select end date/time"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedToDate}
            onSelect={handleToDateSelect}
          />
          <div className="space-y-1 border-t p-3">
            <label className="text-xs text-muted-foreground">End time</label>
            <input
              type="time"
              value={getTimePart(dateTo, "23:59")}
              onChange={(event) => handleToTimeChange(event.target.value)}
              disabled={!dateTo}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
              aria-label="End time"
            />
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="icon"
        type="button"
        onClick={onClearDateRange}
        aria-label="Clear date range"
        title="Clear date range"
        className="shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
