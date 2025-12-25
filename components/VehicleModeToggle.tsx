"use client";

import * as React from "react";

import type { VehicleMode } from "@/lib/effectiveStatus";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface VehicleModeToggleProps {
  value: VehicleMode;
  onChange: (value: VehicleMode) => void;
}

export function VehicleModeToggle({ value, onChange }: VehicleModeToggleProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Vehicle
      </span>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue === "car" || nextValue === "truck") {
            onChange(nextValue);
          }
        }}
      >
        <ToggleGroupItem value="car" aria-label="Car or SUV">
          🚗 Car/SUV
        </ToggleGroupItem>
        <ToggleGroupItem value="truck" aria-label="Truck or commercial">
          🚚 Truck/Commercial
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
