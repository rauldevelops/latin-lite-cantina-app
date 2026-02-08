import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncAllContactsToLoops } from "@/lib/loops/contacts";

/**
 * POST /api/admin/loops/sync
 * Syncs all users to Loops. Admin only.
 * Use this for initial migration or to fix sync issues.
 */
export async function POST() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllContactsToLoops();

    return NextResponse.json({
      success: true,
      message: `Synced ${result.synced} contacts to Loops`,
      ...result,
    });
  } catch (error) {
    console.error("Failed to sync contacts to Loops:", error);
    return NextResponse.json(
      { error: "Failed to sync contacts" },
      { status: 500 }
    );
  }
}
