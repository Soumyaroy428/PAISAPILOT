import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import {
  exportTransactionsToCsv,
  exportTransactionsToJson,
} from "@/server/services/export.service";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const dateSlug = new Date().toISOString().split("T")[0];

    if (format === "json") {
      const data = await exportTransactionsToJson(
        user.userId,
        startDate,
        endDate
      );

      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="paisapilot-transactions-${dateSlug}.json"`,
        },
      });
    }

    // Default: CSV export
    const csvContent = await exportTransactionsToCsv(
      user.userId,
      startDate,
      endDate
    );

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="paisapilot-transactions-${dateSlug}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      {
        error: {
          code: "EXPORT_FAILED",
          message: error.message || "Failed to generate financial export.",
        },
      },
      { status: 500 }
    );
  }
}

