import fetch from "node-fetch";

const API_BASE = "http://localhost:3000";

interface Workplace {
  id: number;
  name: string;
  status: number;
}

interface Shift {
  workerId: number | null;
  workplaceId: number;
  cancelledAt: string | null;
  endAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  links?: {
    next?: string;
  };
}

async function fetchAll<T>(endpoint: string): Promise<T[]> {
  let next: string | undefined = `${API_BASE}${endpoint}?page=1`;
  const results: T[] = [];

  while (next) {
    const res = await fetch(next);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${next}: ${res.statusText}`);
    }
    const data: PaginatedResponse<T> = await res.json();
    results.push(...data.data);
    next = data.links?.next;
  }

  return results;
}

async function main() {
  const workplaces = await fetchAll<Workplace>("/workplaces");
  const activeWorkplaces = workplaces.filter((w) => w.status === 0);

  const shifts = await fetchAll<Shift>("/shifts");
  const now = new Date();
  const shiftCounts: Record<number, number> = {};

  for (const shift of shifts) {
    if (
      shift.workerId !== null &&
      shift.cancelledAt === null &&
      new Date(shift.endAt) < now
    ) {
      shiftCounts[shift.workplaceId] =
        (shiftCounts[shift.workplaceId] || 0) + 1;
    }
  }

  const workplaceStats = activeWorkplaces.map((w) => ({
    name: w.name,
    shifts: shiftCounts[w.id] || 0,
  }));

  workplaceStats.sort((a, b) => b.shifts - a.shifts);
  const top3 = workplaceStats.slice(0, 3);

  process.stdout.write(JSON.stringify(top3));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
