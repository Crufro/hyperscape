"use client";

import { Progress } from "@/components/ui/progress";

interface ProgressTrackerProps {
  progress: number;
  currentStep?: string;
}

export function ProgressTracker({
  progress,
  currentStep,
}: ProgressTrackerProps) {
  return (
    <div className="space-y-2">
      {currentStep && (
        <p className="text-sm text-muted-foreground">{currentStep}</p>
      )}
      <Progress value={progress} />
      <p className="text-xs text-muted-foreground text-right">
        {Math.round(progress)}%
      </p>
    </div>
  );
}
