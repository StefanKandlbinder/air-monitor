import { Button } from "@/components/ui/button";

export function ParameterSection({
  title,
  parameters,
  selectedParameters,
  onToggleParameter,
}: {
  title: string;
  parameters: string[];
  selectedParameters: string[];
  onToggleParameter: (parameter: string) => void;
}) {
  if (!parameters.length) {
    return null;
  }

  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {parameters.map((parameter) => {
          const selected = selectedParameters.includes(parameter);
          return (
            <Button
              key={parameter}
              variant={selected ? "default" : "outline"}
              size="sm"
              type="button"
              className="h-7 px-2 text-[11px]"
              onClick={() => onToggleParameter(parameter)}
            >
              {parameter}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
