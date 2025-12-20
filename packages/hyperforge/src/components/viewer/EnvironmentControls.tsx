"use client";

import { Select } from "@/components/ui/select";

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
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-32">
      <Select
        value={environment}
        onChange={onEnvironmentChange}
        options={environmentOptions}
        openUp
      />
    </div>
  );
}
