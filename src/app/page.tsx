import Link from "next/link";
import { ArrowUpRight, TriangleAlert } from "lucide-react";
import { RelayTimeline, type TimelineNode } from "@/components/relay-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dateOnly, dayName, roomRunsOn } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { effectiveGeneralAssignments } from "@/lib/scheduler";

// This page depends on "today" and live DB state - never prerender it statically.
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const today = dateOnly(new Date());
  const dname = dayName(today);

  const [employeeCount, taskCount, cleanroomPool, pao3, leavesToday, weeklyAssignmentsCount] = await Promise.all([
    prisma.employee.count({ where: { active: true } }),
    prisma.generalTask.count({ where: { active: true } }),
    prisma.employee.count({ where: { active: true, doesCleanroom: true, shift: "Night" } }),
    prisma.cleanroomRoom.findUnique({ where: { name: "PAO3" } }),
    prisma.leaveRecord.findMany({
      where: { startDate: { lte: today }, endDate: { gte: today } },
      include: { employee: true },
    }),
    prisma.weeklyAssignment.count({
      where: {
        weekStart: new Date(today.getTime() - ((today.getUTCDay() + 6) % 7) * 86400000),
      },
    }),
  ]);

  const isSpecialDay = !!pao3 && roomRunsOn(pao3, dname);

  const effective = await effectiveGeneralAssignments(today);
  const unassignedToday = [...effective.values()].filter((v) => v == null).length;

  const relayToday = await prisma.cleanroomRelayAssignment.findMany({ where: { day: today } });
  const relayGenerated = relayToday.length > 0;

  const nodes: TimelineNode[] = isSpecialDay
    ? [
        { time: "21:30", label: "Clock-in", sub: "PAO3 first tonight", tone: "start" },
        { time: "—", label: "PAO3", sub: "Self-contained, full crew", tone: "room" },
        { time: "→", label: "General cleaning", sub: "Rest of the shift", tone: "room" },
        { time: "02:00", label: "Pre-step", sub: "Gowning bins + water", tone: "room" },
        { time: "02:30", label: "CCRI", sub: "3 people, feeds PAO2", tone: "room" },
        { time: "03:00", label: "PAO1 → PAO2", sub: "Relay + mop cascade", tone: "room" },
        { time: "05:00", label: "Target finish", sub: "All rooms closed out", tone: "finish" },
      ]
    : [
        { time: "21:30", label: "Clock-in", sub: "General cleaning starts", tone: "start" },
        { time: "02:00", label: "Pre-step", sub: "Gowning bins + water", tone: "room" },
        { time: "02:30", label: "CCRI", sub: "3 people, feeds PAO2", tone: "room" },
        { time: "03:00", label: "PAO1 → PAO2", sub: "Relay + mop cascade", tone: "room" },
        { time: "05:00", label: "Target finish", sub: "All rooms closed out", tone: "finish" },
      ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            {today.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Tonight&rsquo;s relay</h1>
        </div>
        <Button asChild>
          <Link href="/daily">
            Open Daily Schedule <ArrowUpRight />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b-0 pb-0">
          <div>
            <CardTitle className="text-base">
              {isSpecialDay ? "PAO3 night — 4 cleanrooms" : "Standard night — 3 cleanrooms"}
            </CardTitle>
            <p className="mt-1 text-[13px] text-ink-soft">
              {relayGenerated
                ? "Relay plan generated for today."
                : "No relay plan generated yet — head to Daily Schedule."}
            </p>
          </div>
          {!relayGenerated && <Badge variant="signal">Not generated</Badge>}
        </CardHeader>
        <CardContent>
          <RelayTimeline nodes={nodes} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Active employees" value={employeeCount} href="/employees" />
        <StatTile label="General tasks" value={taskCount} href="/tasks" />
        <StatTile label="Night cleanroom pool" value={cleanroomPool} href="/cleanroom" />
        <StatTile
          label="This week's roster"
          value={weeklyAssignmentsCount}
          hint={weeklyAssignmentsCount === 0 ? "Not generated" : `${weeklyAssignmentsCount} tasks assigned`}
          href="/weekly-roster"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Off today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leavesToday.length === 0 ? (
              <p className="text-sm text-ink-soft">Nobody marked off.</p>
            ) : (
              leavesToday.map((lr) => (
                <div key={lr.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink">
                    {lr.employee.initials} &middot; {lr.employee.name}
                  </span>
                  <Badge variant={lr.leaveType === "Sick" ? "dirty" : "neutral"}>{lr.leaveType}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attention needed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unassignedToday === 0 && weeklyAssignmentsCount > 0 ? (
              <p className="flex items-center gap-2 text-sm text-ok">Every task today has an owner.</p>
            ) : weeklyAssignmentsCount === 0 ? (
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <TriangleAlert className="size-4 text-signal-ink dark:text-signal" />
                Generate this week&rsquo;s roster to see coverage.
              </p>
            ) : (
              <p className="flex items-center gap-2 text-sm text-danger">
                <TriangleAlert className="size-4" />
                {unassignedToday} task{unassignedToday === 1 ? "" : "s"} unassigned today.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number;
  hint?: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-signal">
        <CardContent className="p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">{label}</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-ink">{value}</p>
          {hint && <p className="mt-0.5 text-[12px] text-ink-soft">{hint}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}
