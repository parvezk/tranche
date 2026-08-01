import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
    const cookieStore = cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase auth not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignored in route handler
          }
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
