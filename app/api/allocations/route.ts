import { NextResponse } from "next/server";

import { getAllocationSnapshots, saveAllocationSnapshot } from "@/lib/server/allocations";

export async function GET() {
  try {
    const allocations = await getAllocationSnapshots();
    return NextResponse.json({ allocations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load allocations" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const budget = Number(body?.budget);
    const allocated = Number(body?.allocated);
    const positions = Array.isArray(body?.positions) ? body.positions : [];

    if (!Number.isFinite(budget) || !Number.isFinite(allocated)) {
      return NextResponse.json({ error: "Invalid allocation totals" }, { status: 400 });
    }

    const allocation = await saveAllocationSnapshot({
      budget,
      allocated,
      positions,
    });

    return NextResponse.json({ allocation }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save allocation" },
      { status: 500 },
    );
  }
}
