import { NextResponse } from "next/server";
import { getHealthStatus } from "@/server/services/health.service";

export async function GET() {
  const health = getHealthStatus();
  return NextResponse.json(health);
}
