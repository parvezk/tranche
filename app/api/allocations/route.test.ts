import { describe, test, expect, mock } from "bun:test";
import { POST } from "./route";

mock.module("next/headers", () => ({
  cookies: () => ({
    getAll: () => [],
    set: () => {},
  }),
}));

mock.module("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null }, error: new Error("Auth error") })
    }
  })
}));

describe("POST /api/allocations", () => {
  test("returns 401 when unauthenticated", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const req = new Request("http://localhost/api/allocations", {
      method: "POST",
      body: JSON.stringify({ budget: 100, allocated: 50, positions: [] })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
