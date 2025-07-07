const fetch = require("node-fetch");

const API_BASE = "http://localhost:3000";

async function fetchAll(endpoint) {
  let next = `${API_BASE}${endpoint}?page=1`;
  const results = [];
  while (next) {
    const res = await fetch(next);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${next}: ${res.statusText}`);
    }
    const data = await res.json();
    results.push(...data.data);
    next = data.links?.next;
  }
  return results;
}

async function main() {
  const workplaces = await fetchAll("/workplaces");
  const activeWorkplaces = workplaces.filter((w) => w.status === 0);

  const shifts = await fetchAll("/shifts");
  const now = new Date();
  const shiftCounts = {};

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