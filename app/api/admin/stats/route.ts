import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    const { api } = await import("../../../../convex/_generated/api");
    const stats = await convex.query(api.admin.getStats, {});
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[Admin Stats API]", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
