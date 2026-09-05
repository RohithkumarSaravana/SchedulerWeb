"use client";

import { useState, useTransition } from "react";
import { updateWeights } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm({ settings }: { settings: Record<string, string> }) {
  const [values, setValues] = useState({
    wCount: Number(settings.w_count ?? 1.0),
    wMinutes: Number(settings.w_minutes ?? 0.05),
    wSize: Number(settings.w_size ?? 0.5),
  });
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await updateWeights(values);
      setSaved(true);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workload score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[13px] text-ink-soft">
          <code className="font-mono">score = w_count + w_minutes × estimated_minutes + w_size × size</code>
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="w_count">w_count</Label>
            <Input
              id="w_count"
              type="number"
              step={0.1}
              value={values.wCount}
              onChange={(e) => {
                setValues({ ...values, wCount: Number(e.target.value) });
                setSaved(false);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w_minutes">w_minutes</Label>
            <Input
              id="w_minutes"
              type="number"
              step={0.01}
              value={values.wMinutes}
              onChange={(e) => {
                setValues({ ...values, wMinutes: Number(e.target.value) });
                setSaved(false);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w_size">w_size</Label>
            <Input
              id="w_size"
              type="number"
              step={0.1}
              value={values.wSize}
              onChange={(e) => {
                setValues({ ...values, wSize: Number(e.target.value) });
                setSaved(false);
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
          {saved && <span className="text-[13px] text-ok">Saved.</span>}
        </div>
      </CardContent>
    </Card>
  );
}
