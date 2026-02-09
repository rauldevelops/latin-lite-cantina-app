import { NextRequest, NextResponse } from "next/server";
import { syncAllContactsToLoops } from "@/lib/loops/contacts";

/**
 * Cron job endpoint to sync all contacts to Loops daily
 * This updates daysSinceLastOrder and other computed properties
 *
 * Vercel Cron: Configured in vercel.json to run daily at 2am ET
 * Manual trigger: GET /api/cron/sync-contacts?key=YOUR_CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Check both Authorization header (Vercel Cron) and query param (manual trigger)
    const queryKey = request.nextUrl.searchParams.get("key");

    if (authHeader !== `Bearer ${cronSecret}` && queryKey !== cronSecret) {
      console.error("[Cron] Unauthorized sync-contacts attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting daily contact sync...");
    const startTime = Date.now();

    const result = await syncAllContactsToLoops();

    const duration = Date.now() - startTime;
    console.log(
      `[Cron] Contact sync completed in ${duration}ms:`,
      `${result.synced} synced, ${result.failed} failed, ${result.total} total`
    );

    return NextResponse.json({
      success: true,
      ...result,
      durationMs: duration,
    });
  } catch (error) {
    console.error("[Cron] Contact sync failed:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
