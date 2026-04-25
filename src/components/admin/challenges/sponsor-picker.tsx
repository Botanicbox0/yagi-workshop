"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { listSponsorCandidatesAction } from "@/app/[locale]/app/admin/challenges/actions";

type Sponsor = { id: string; company_name: string };

export function ChallengeSponsorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (sponsorId: string | null) => void;
}) {
  const [enabled, setEnabled] = useState(value !== null);
  const [candidates, setCandidates] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || candidates.length > 0) return;
    setLoading(true);
    void listSponsorCandidatesAction().then((res) => {
      if (res.ok) setCandidates(res.clients);
      setLoading(false);
    });
  }, [enabled, candidates.length]);

  function handleEnabled(next: boolean) {
    setEnabled(next);
    if (!next) onChange(null);
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="font-medium">후원사 (Sponsored challenge)</Label>
          <p className="text-xs text-muted-foreground mt-1">
            후원사가 있으면 공개 페이지에 &quot;Sponsored by 회사명&quot; 표시됩니다.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={handleEnabled} />
      </div>

      {enabled && (
        <div className="space-y-2 pt-2 border-t border-border">
          <Label htmlFor="sponsor_client_id">후원사 선택</Label>
          {loading ? (
            <p className="text-xs text-muted-foreground">불러오는 중...</p>
          ) : candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              등록된 client가 없습니다. 후원사가 먼저 client로 가입해야 합니다.
            </p>
          ) : (
            <Select
              value={value ?? undefined}
              onValueChange={(v) => onChange(v || null)}
            >
              <SelectTrigger id="sponsor_client_id">
                <SelectValue placeholder="회사 선택" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
