/**
 * Dummy dataset - ported from the Python prototype's core/seed.py.
 * Tasks are transcribed from the supervisor's "Week of 17 Aug 2026" sheet
 * (see the Python project's data/task_sheet_transcription.md). Employees are invented
 * for testing. Everything here is editable in the app once it is running.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { csv } from "../src/lib/domain";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: DATABASE_URL }) });

const M = "Morning";
const E = "Evening";
const N = "Night";
const DAILY = "Daily";

type EmployeeSeed = {
  name: string;
  initials: string;
  shift: string;
  doesCleanroom: boolean;
  machines: string[];
};

const EMPLOYEES: EmployeeSeed[] = [
  { name: "Maria Gomez", initials: "MG", shift: M, doesCleanroom: false, machines: ["Scrubber"] },
  { name: "Peter Adeyemi", initials: "PA", shift: M, doesCleanroom: false, machines: ["Vacuum"] },
  { name: "Anna Kowalski", initials: "AK", shift: M, doesCleanroom: false, machines: [] },
  { name: "Sunil Rao", initials: "SR", shift: M, doesCleanroom: false, machines: ["Auto-scrubber", "Scrubber"] },
  { name: "Grace Owusu", initials: "GO", shift: M, doesCleanroom: false, machines: [] },
  { name: "Tomasz Nowak", initials: "TN", shift: M, doesCleanroom: false, machines: ["Buffer"] },
  { name: "Fatima Bello", initials: "FB", shift: M, doesCleanroom: false, machines: [] },
  { name: "John Murphy", initials: "JM", shift: M, doesCleanroom: false, machines: ["Vacuum"] },
  { name: "Elena Popescu", initials: "EP", shift: M, doesCleanroom: false, machines: [] },

  { name: "Diego Torres", initials: "DT", shift: E, doesCleanroom: false, machines: ["Vacuum"] },
  { name: "Priya Nair", initials: "PN", shift: E, doesCleanroom: false, machines: [] },
  { name: "Kwame Mensah", initials: "KM", shift: E, doesCleanroom: false, machines: ["Scrubber"] },
  { name: "Olga Ivanova", initials: "OI", shift: E, doesCleanroom: false, machines: [] },
  { name: "Sam Whitfield", initials: "SW", shift: E, doesCleanroom: false, machines: ["Buffer", "Vacuum"] },
  { name: "Lucia Ferrari", initials: "LF", shift: E, doesCleanroom: false, machines: [] },
  { name: "Hassan Ali", initials: "HA", shift: E, doesCleanroom: false, machines: [] },

  { name: "Daniel Cole", initials: "Daniel", shift: N, doesCleanroom: true, machines: ["Scrubber", "Auto-scrubber"] },
  { name: "Josh Owen", initials: "JO", shift: N, doesCleanroom: true, machines: ["Vacuum", "Scrubber"] },
  { name: "Nathan Brooks", initials: "NB", shift: N, doesCleanroom: true, machines: ["Scrubber", "Buffer"] },
  { name: "Nina Simmons", initials: "NS", shift: N, doesCleanroom: true, machines: ["Vacuum"] },
  { name: "Marek Levine", initials: "ML", shift: N, doesCleanroom: true, machines: ["Vacuum"] },
  { name: "Ravi Kapoor", initials: "RK", shift: N, doesCleanroom: true, machines: ["Vacuum", "Auto-scrubber"] },
  { name: "Elias Vance", initials: "EV", shift: N, doesCleanroom: true, machines: ["Vacuum"] },
  { name: "Stella Tan", initials: "ST", shift: N, doesCleanroom: true, machines: [] },
  { name: "Mo Zaman", initials: "MZ", shift: N, doesCleanroom: true, machines: ["Vacuum"] },
  { name: "Emeka Kalu", initials: "EK", shift: N, doesCleanroom: true, machines: ["Vacuum", "Scrubber"] },
  { name: "Sofia Alvarez", initials: "SA", shift: N, doesCleanroom: true, machines: ["Vacuum"] },
  { name: "Liam Bright", initials: "LB", shift: N, doesCleanroom: true, machines: ["Vacuum"] },
  { name: "Rosa Costa", initials: "RC", shift: N, doesCleanroom: true, machines: ["Vacuum"] },
  // Night-shift but general-cleaning only (13 do the cleanroom relay; these 3 don't)
  { name: "Jamal Ahmed", initials: "JA", shift: N, doesCleanroom: false, machines: [] },
  { name: "Ade Sanni", initials: "AS", shift: N, doesCleanroom: false, machines: ["Vacuum", "Scrubber"] },
  { name: "Sean Carter", initials: "SC", shift: N, doesCleanroom: false, machines: [] },
];

const FINAL_CHECK = new Set(["Daniel", "NB", "JO", "NS", "ST"]);

type TaskSeed = {
  name: string;
  shift: string;
  area: string;
  minutes: number;
  size: number;
  frequency: string;
  days: string;
  machine: string | null;
  isExtra: boolean;
};

const TASKS: TaskSeed[] = [
  // Morning (green)
  { name: "Canteen (Main Sitting Area) & Microwaves", shift: M, area: "Ground", minutes: 30, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Toilets - Main Males/Female/Disabled/Visitors Reception", shift: M, area: "Ground", minutes: 40, size: 3, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Toilets - Kitchen x3 / Warehouse x1 / Boxing x3", shift: M, area: "Ground", minutes: 35, size: 3, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Main Corridors/Skirtings/Wall fixtures/Fittings/Fire points", shift: M, area: "Ground", minutes: 45, size: 3, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Push & Pull (Day)", shift: M, area: "Ground", minutes: 15, size: 1, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Main Warehouse / Raw Materials / Plant rm / Metal rm", shift: M, area: "Warehouse", minutes: 40, size: 3, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Main Road Rubbish + Ash Trays", shift: M, area: "External", minutes: 20, size: 1, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Laundry (Day)", shift: M, area: "Ground", minutes: 25, size: 2, frequency: "Specific days", days: "Mon", machine: null, isExtra: false },
  { name: "Security Hut", shift: M, area: "External", minutes: 15, size: 1, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Fridge Room + Small Fridges (shelves/tops/inside)", shift: M, area: "Kitchen", minutes: 30, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Drinking Fountains", shift: M, area: "Ground", minutes: 15, size: 1, frequency: "3x weekly", days: "Mon,Wed,Fri", machine: null, isExtra: false },

  // Evening (pink)
  { name: "1st Floor - All bins", shift: E, area: "1st Floor", minutes: 25, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "1st Floor - All bathrooms", shift: E, area: "1st Floor", minutes: 40, size: 3, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "1st Floor - Offices/Kitchen/Training rooms/Janitor room", shift: E, area: "1st Floor", minutes: 45, size: 3, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "PV Labs", shift: E, area: "Labs", minutes: 30, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Boxing Area 1 + 3", shift: E, area: "Boxing", minutes: 40, size: 3, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Visitors Entrance + Interview rm + Meeting rm", shift: E, area: "Ground", minutes: 25, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "TTEC Training Room", shift: E, area: "Training", minutes: 25, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Drain Flush", shift: E, area: "Ground", minutes: 20, size: 1, frequency: "Twice weekly", days: "Tue,Fri", machine: null, isExtra: false },
  { name: "Shower Rm", shift: E, area: "Ground", minutes: 25, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Toilets - Main Males/Female/Disabled/Visitors Reception (Eve)", shift: E, area: "Ground", minutes: 40, size: 3, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Toilets - Kitchen x3 / Warehouse x1 / Boxing x3 (Eve)", shift: E, area: "Ground", minutes: 35, size: 3, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Training Room", shift: E, area: "Training", minutes: 20, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Mother Room + Nurse Room", shift: E, area: "Ground", minutes: 20, size: 1, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Shower Mats", shift: E, area: "Ground", minutes: 15, size: 1, frequency: "Specific days", days: "Fri,Sun", machine: null, isExtra: false },

  // Night (blue - Boxing Area 2 block)
  { name: "Boxing Area 2", shift: N, area: "Boxing", minutes: 40, size: 3, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Facilities Corridor", shift: N, area: "Facilities", minutes: 25, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Janitor Room + Hoover Maintenance", shift: N, area: "Facilities", minutes: 25, size: 2, frequency: DAILY, days: "", machine: "Vacuum", isExtra: false },
  { name: "Kitchen Floor (Scrubber Dryer)", shift: N, area: "Kitchen", minutes: 45, size: 3, frequency: "Weekly", days: "Wed", machine: "Scrubber", isExtra: false },
  { name: "Calibration & Warehouse Offices", shift: N, area: "Warehouse", minutes: 35, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Locker Rm + Corridor (top-of-lockers dusting)", shift: N, area: "Ground", minutes: 30, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Gym Rm + Corridor", shift: N, area: "Ground", minutes: 30, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Sinks Canteen Area", shift: N, area: "Kitchen", minutes: 20, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "All Bins Ground Floor", shift: N, area: "Ground", minutes: 30, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Production Offices", shift: N, area: "Production", minutes: 35, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Engineering Offices", shift: N, area: "Engineering", minutes: 30, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Canteen Service Area + Relaxing Area + Privacy Booth", shift: N, area: "Kitchen", minutes: 30, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Employee Entrance + Fridge rm + Lift + Security Office", shift: N, area: "Ground", minutes: 25, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Stairwells 1, 2, 3", shift: N, area: "Ground", minutes: 30, size: 2, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Main Corridors/Skirtings/Wall fixtures/Fittings/Fire points (Night)", shift: N, area: "Ground", minutes: 45, size: 3, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Push & Pull (Night)", shift: N, area: "Ground", minutes: 15, size: 1, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Laundry (Night)", shift: N, area: "Ground", minutes: 25, size: 2, frequency: "Specific days", days: "Thu", machine: null, isExtra: false },
  { name: "Bin run - Gowning Stage 1 / Transfer Room (07:30)", shift: N, area: "Cleanroom", minutes: 20, size: 1, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Bin run - Dirty side PA01/PA02/CCRI (09:30)", shift: N, area: "Cleanroom", minutes: 20, size: 1, frequency: DAILY, days: "", machine: null, isExtra: false },
  { name: "Bin run - Canteen Main Sitting + Sink bins (13:00)", shift: N, area: "Kitchen", minutes: 20, size: 1, frequency: DAILY, days: "", machine: null, isExtra: false },

  // Night extras (black handwritten - may change weekly)
  { name: "Extra - Main Hallway", shift: N, area: "Ground", minutes: 20, size: 1, frequency: "Specific days", days: "Mon,Tue,Wed", machine: null, isExtra: true },
  { name: "Extra - Boxing 2", shift: N, area: "Boxing", minutes: 20, size: 1, frequency: "Specific days", days: "Tue", machine: null, isExtra: true },
  { name: "Extra - Facilities", shift: N, area: "Facilities", minutes: 20, size: 1, frequency: "Specific days", days: "Mon,Thu", machine: null, isExtra: true },
  { name: "Extra - Mop / Walk / Scrubber-Dryer rotation", shift: N, area: "Ground", minutes: 30, size: 2, frequency: DAILY, days: "", machine: "Scrubber", isExtra: true },
  { name: "Extra - Employee Entrance", shift: N, area: "Ground", minutes: 15, size: 1, frequency: "Specific days", days: "Tue,Thu", machine: null, isExtra: true },
  { name: "Extra - 1st Floor Hallway", shift: N, area: "1st Floor", minutes: 20, size: 1, frequency: "Specific days", days: "Mon,Tue", machine: null, isExtra: true },
  { name: "Extra - Buffing", shift: N, area: "Ground", minutes: 40, size: 2, frequency: "Weekly", days: "Sat", machine: "Buffer", isExtra: true },
];

const ROOMS: { name: string; activeDays: string }[] = [
  { name: "PAO1", activeDays: "ALL" },
  { name: "PAO2", activeDays: "ALL" },
  { name: "CCRI", activeDays: "ALL" },
  { name: "PAO3", activeDays: "Wed,Sun" },
];

const SETTINGS: Record<string, string> = {
  w_count: "1.0",
  w_minutes: "0.05",
  w_size: "0.5",
  ccri_size: "3",
  pao1_vacuum: "4",
  cleanroom_bins: "2",
  pao2_vacuum_max: "6",
  relay_lookback_days: "14",
};

async function main() {
  // Idempotent: wipe first so re-running this script never duplicates rows.
  await prisma.cleanroomRelayAssignment.deleteMany();
  await prisma.coverageOverride.deleteMany();
  await prisma.weeklyAssignment.deleteMany();
  await prisma.leaveRecord.deleteMany();
  await prisma.taskTraining.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.generalTask.deleteMany();
  await prisma.cleanroomRoom.deleteMany();
  await prisma.setting.deleteMany();

  const taskIdByName = new Map<string, number>();
  for (const t of TASKS) {
    const row = await prisma.generalTask.create({
      data: {
        name: t.name,
        shift: t.shift,
        area: t.area,
        estMinutes: t.minutes,
        size: t.size,
        frequency: t.frequency,
        specificDays: t.days,
        requiredMachine: t.machine,
        isExtra: t.isExtra,
      },
    });
    taskIdByName.set(t.name, row.id);
  }

  for (const e of EMPLOYEES) {
    const emp = await prisma.employee.create({
      data: {
        name: e.name,
        initials: e.initials,
        shift: e.shift,
        doesGeneral: true,
        doesCleanroom: e.doesCleanroom,
        machineCerts: csv(e.machines),
        skills: FINAL_CHECK.has(e.initials) ? "Final-check" : "",
      },
    });
    // dummy training: trained on every task of their shift whose machine (if any) they hold
    const trainedTaskIds = TASKS.filter(
      (t) => t.shift === e.shift && (!t.machine || e.machines.includes(t.machine))
    ).map((t) => taskIdByName.get(t.name)!);
    if (trainedTaskIds.length) {
      await prisma.taskTraining.createMany({
        data: trainedTaskIds.map((taskId) => ({ employeeId: emp.id, taskId })),
      });
    }
  }

  for (const r of ROOMS) {
    await prisma.cleanroomRoom.create({ data: r });
  }

  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.create({ data: { key, value } });
  }

  console.log(`Seeded ${EMPLOYEES.length} employees, ${TASKS.length} tasks, ${ROOMS.length} rooms.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
