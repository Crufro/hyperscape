"use client";

import { Modal, Switch, Select, Slider } from "@/components/ui";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { RotateCcw } from "lucide-react";

export interface ViewportSettings {
  environment: string;
  showGrid: boolean;
  gridSize: number;
  gridDivisions: number;
  ambientIntensity: number;
  directionalIntensity: number;
  cameraFov: number;
  autoRotate: boolean;
}

export const DEFAULT_VIEWPORT_SETTINGS: ViewportSettings = {
  environment: "studio",
  showGrid: true,
  gridSize: 10,
  gridDivisions: 10,
  ambientIntensity: 0.4,
  directionalIntensity: 1,
  cameraFov: 50,
  autoRotate: false,
};

interface ViewportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ViewportSettings;
  onSettingsChange: (settings: ViewportSettings) => void;
}

const environmentOptions = [
  { value: "neutral", label: "Neutral" },
  { value: "studio", label: "Studio" },
  { value: "outdoor", label: "Outdoor" },
  { value: "indoor", label: "Indoor" },
  { value: "night", label: "Night" },
];

export function ViewportSettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: ViewportSettingsModalProps) {
  const updateSetting = <K extends keyof ViewportSettings>(
    key: K,
    value: ViewportSettings[K],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleReset = () => {
    onSettingsChange(DEFAULT_VIEWPORT_SETTINGS);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Viewport Settings"
      size="medium"
      footer={
        <>
          <SpectacularButton variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </SpectacularButton>
          <SpectacularButton variant="primary" size="sm" onClick={onClose}>
            Done
          </SpectacularButton>
        </>
      }
    >
      <div className="space-y-6">
        {/* Environment Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Environment</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Preset</label>
              <div className="w-40">
                <Select
                  value={settings.environment}
                  onChange={(value) => updateSetting("environment", value)}
                  options={environmentOptions}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Grid Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Grid</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Show Grid</label>
              <Switch
                checked={settings.showGrid}
                onCheckedChange={(checked) =>
                  updateSetting("showGrid", checked)
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  Grid Size
                </label>
                <span className="text-xs text-muted">{settings.gridSize}</span>
              </div>
              <Slider
                value={[settings.gridSize]}
                onValueChange={([value]) => updateSetting("gridSize", value)}
                min={5}
                max={50}
                step={5}
                disabled={!settings.showGrid}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  Divisions
                </label>
                <span className="text-xs text-muted">
                  {settings.gridDivisions}
                </span>
              </div>
              <Slider
                value={[settings.gridDivisions]}
                onValueChange={([value]) =>
                  updateSetting("gridDivisions", value)
                }
                min={5}
                max={20}
                step={1}
                disabled={!settings.showGrid}
              />
            </div>
          </div>
        </div>

        {/* Lighting Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Lighting</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Ambient</label>
                <span className="text-xs text-muted">
                  {(settings.ambientIntensity * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[settings.ambientIntensity]}
                onValueChange={([value]) =>
                  updateSetting("ambientIntensity", value)
                }
                min={0}
                max={2}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  Directional
                </label>
                <span className="text-xs text-muted">
                  {(settings.directionalIntensity * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[settings.directionalIntensity]}
                onValueChange={([value]) =>
                  updateSetting("directionalIntensity", value)
                }
                min={0}
                max={3}
                step={0.1}
              />
            </div>
          </div>
        </div>

        {/* Camera Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Camera</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  Field of View
                </label>
                <span className="text-xs text-muted">
                  {settings.cameraFov}°
                </span>
              </div>
              <Slider
                value={[settings.cameraFov]}
                onValueChange={([value]) => updateSetting("cameraFov", value)}
                min={30}
                max={90}
                step={5}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">
                Auto-Rotate
              </label>
              <Switch
                checked={settings.autoRotate}
                onCheckedChange={(checked) =>
                  updateSetting("autoRotate", checked)
                }
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
