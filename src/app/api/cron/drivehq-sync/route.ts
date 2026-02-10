/**
 * DriveHQ Sync Cron Endpoint
 *
 * GET /api/cron/drivehq-sync
 *
 * Triggered by external cron (Railway cron or cron-job.org) hourly.
 * Protected by CRON_SECRET bearer token.
 */

import { NextRequest, NextResponse } from "next/server";
import { runDriveHQSync } from "@/server/services/drivehq/sync-coordinator";

function validateAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  // Support both "Bearer <token>" and raw token
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  return token === cronSecret;
}

export async function GET(request: NextRequest) {
  // Auth check
  if (!validateAuth(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await runDriveHQSync(null);

    return NextResponse.json({
      success: true,
      totalDurationMs: result.totalDurationMs,
      results: result.results.map((r) => ({
        entityType: r.entityType,
        status: r.status,
        fileName: r.fileName,
        recordsProcessed: r.recordsProcessed,
        recordsCreated: r.recordsCreated,
        recordsUpdated: r.recordsUpdated,
        errorMessage: r.errorMessage,
        durationMs: r.durationMs,
      })),
    });
  } catch (err) {
    console.error("[DriveHQ Sync] Cron endpoint error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
