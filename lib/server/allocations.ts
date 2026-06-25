import { createServerSupabaseClient } from "@/lib/server/supabase";
import { formatSupabaseError } from "@/lib/server/supabase-errors";
import { type Position } from "@/lib/store";

export interface AllocationSnapshot {
  id: string;
  created_at: string;
  budget: number;
  allocated: number;
  entry_count: number;
  snapshot: {
    budget: number;
    allocated: number;
    positions: Position[];
  };
}

export async function saveAllocationSnapshot(input: {
  budget: number;
  allocated: number;
  positions: Position[];
}) {
  const supabase = createServerSupabaseClient();
  const positions = input.positions.filter((position) => position.ticker.trim() || position.name.trim());

  const { data, error } = await supabase
    .from("allocation_snapshots")
    .insert({
      budget: input.budget,
      allocated: input.allocated,
      entry_count: positions.length,
      snapshot: {
        budget: input.budget,
        allocated: input.allocated,
        positions,
      },
    })
    .select("id, created_at, budget, allocated, entry_count, snapshot")
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error, "Unable to save allocation."));
  }

  return data as AllocationSnapshot;
}

export async function getAllocationSnapshots() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("allocation_snapshots")
    .select("id, created_at, budget, allocated, entry_count, snapshot")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(formatSupabaseError(error, "Unable to load allocation history."));
  }

  return (data ?? []) as AllocationSnapshot[];
}
