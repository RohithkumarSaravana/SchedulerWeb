"use client";

import type { CleanroomRoom } from "@prisma/client";
import { useState, useTransition } from "react";
import { updateRelaySettings, updateRoom } from "@/app/actions/cleanroom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CleanroomSetupForm({
  rooms,
  settings,
}: {
  rooms: CleanroomRoom[];
  settings: Record<string, string>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Rooms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[13px] text-ink-soft">
            <code className="font-mono">activeDays</code> is <code className="font-mono">ALL</code> or a list
            like <code className="font-mono">Wed,Sun</code>. Room names CCRI / PAO1 / PAO2 / PAO3 are
            referenced directly by the relay logic — don&rsquo;t rename them.
          </p>
          {rooms.map((r) => (
            <RoomRow key={r.id} room={r} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relay headcounts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-[13px] text-ink-soft">
            Bins and Vacuum are protected (filled first). When the crew is short, Sinks+Gowning merge into
            one person first, then Production+Glass.
          </p>
          <RelaySettingsForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}

function RoomRow({ room }: { room: CleanroomRoom }) {
  const [activeDays, setActiveDays] = useState(room.activeDays);
  const [active, setActive] = useState(room.active);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  function save() {
    startTransition(async () => {
      await updateRoom({ id: room.id, activeDays, active });
      setDirty(false);
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-steel-line-soft p-3">
      <Badge variant={active ? "clean" : "neutral"} className="w-16 justify-center">
        {room.name}
      </Badge>
      <Input
        value={activeDays}
        onChange={(e) => {
          setActiveDays(e.target.value);
          setDirty(true);
        }}
        className="max-w-[160px]"
      />
      <label className="flex items-center gap-1.5 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => {
            setActive(e.target.checked);
            setDirty(true);
          }}
          className="size-4 accent-signal"
        />
        Active
      </label>
      <Button variant="outline" size="sm" className="ml-auto" onClick={save} disabled={!dirty || pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function RelaySettingsForm({ settings }: { settings: Record<string, string> }) {
  const [values, setValues] = useState({
    ccriSize: Number(settings.ccri_size ?? 3),
    pao1Vacuum: Number(settings.pao1_vacuum ?? 4),
    bins: Number(settings.cleanroom_bins ?? 2),
    pao2VacuumMax: Number(settings.pao2_vacuum_max ?? 6),
    relayLookbackDays: Number(settings.relay_lookback_days ?? 14),
  });
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function field(key: keyof typeof values, label: string) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={key}>{label}</Label>
        <Input
          id={key}
          type="number"
          min={1}
          value={values[key]}
          onChange={(e) => {
            setValues({ ...values, [key]: Number(e.target.value) });
            setSaved(false);
          }}
        />
      </div>
    );
  }

  function save() {
    startTransition(async () => {
      await updateRelaySettings(values);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {field("ccriSize", "CCRI team size")}
        {field("pao1Vacuum", "PAO1 Vacuum")}
        {field("bins", "Bins (PAO1 & PAO2)")}
        {field("pao2VacuumMax", "PAO2 Vacuum target")}
      </div>
      {field("relayLookbackDays", "Rotation look-back (days)")}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save relay settings"}
        </Button>
        {saved && <span className="text-[13px] text-ok">Saved.</span>}
      </div>
    </div>
  );
}
