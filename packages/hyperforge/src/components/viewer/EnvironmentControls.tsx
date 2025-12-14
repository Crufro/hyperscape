"use client";

import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface EnvironmentControlsProps {
  environment: string;
  onEnvironmentChange: (env: string) => void;
}

const environmentOptions = [
  { value: "neutral", label: "Neutral" },
  { value: "studio", label: "Studio" },
  { value: "outdoor", label: "Outdoor" },
  { value: "indoor", label: "Indoor" },
  { value: "night", label: "Night" },
];

export function EnvironmentControls({
  environment,
  onEnvironmentChange,
}: EnvironmentControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 glass-panel p-3 rounded-lg z-10">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">
          Environment:
        </Label>
        <Select
          value={environment}
          onChange={onEnvironmentChange}
          options={environmentOptions}
        />
      </div>
    </div>
  );
}
