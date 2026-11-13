import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ error: "Missing phone parameter" }, { status: 400 });
  }

  try {
    const { api } = await import("../../../../convex/_generated/api");
    const messages = await convex.query(api.admin.getMessagesByPhone, { phoneNumber: phone });
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[Admin Messages API]", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
