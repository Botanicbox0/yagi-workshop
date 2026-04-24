"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import type { JudgingConfig } from "@/lib/challenges/types";

export type JudgingConfigBuilderProps = {
  value: JudgingConfig;
  onChange: (v: JudgingConfig) => void;
};

const DEFAULT_ADMIN_WEIGHT = 70;

export function JudgingConfigBuilder({ value, onChange }: JudgingConfigBuilderProps) {
  const adminWeight = value.mode === "hybrid" ? value.admin_weight : DEFAULT_ADMIN_WEIGHT;
  const publicWeight = 100 - adminWeight;

  function handleModeChange(mode: string) {
    if (mode === "admin_only") {
      onChange({ mode: "admin_only" });
    } else if (mode === "public_vote") {
      onChange({ mode: "public_vote" });
    } else if (mode === "hybrid") {
      onChange({ mode: "hybrid", admin_weight: DEFAULT_ADMIN_WEIGHT });
    }
  }

  function handleAdminWeightChange(raw: string) {
    const parsed = Math.min(100, Math.max(0, Number(raw)));
    onChange({ mode: "hybrid", admin_weight: parsed });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">심사 방식</p>
      <RadioGroup value={value.mode} onValueChange={handleModeChange} className="space-y-2">
        <div className="flex items-center gap-3">
          <RadioGroupItem value="admin_only" id="judge-admin-only" />
          <Label htmlFor="judge-admin-only" className="cursor-pointer">
            관리자 심사
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroupItem value="public_vote" id="judge-public-vote" />
          <Label htmlFor="judge-public-vote" className="cursor-pointer">
            공개 심사
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroupItem value="hybrid" id="judge-hybrid" />
          <Label htmlFor="judge-hybrid" className="cursor-pointer">
            혼합 (관리자 + 공개 심사)
          </Label>
        </div>
      </RadioGroup>

      {value.mode === "hybrid" && (
        <div className="ml-7 space-y-3 rounded-lg border border-border p-4">
          <div className="space-y-2">
            <Label htmlFor="judge-admin-weight" className="text-xs text-muted-foreground">
              관리자 심사 비중
            </Label>
            <div className="flex items-center gap-3">
              <input
                id="judge-admin-weight"
                type="range"
                min={0}
                max={100}
                step={1}
                value={adminWeight}
                onChange={(e) => handleAdminWeightChange(e.target.value)}
                className="h-2 w-full cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={adminWeight}
                onChange={(e) => handleAdminWeightChange(e.target.value)}
                className="w-20 shrink-0"
                aria-label="관리자 심사 비중 (숫자 입력)"
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>관리자: {adminWeight}%</span>
            <span>공개 심사: {publicWeight}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
