export interface HealthStatus {
  status: "ok" | "degraded" | "error";
  app: string;
  version: string;
  timestamp: string;
}

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    app: "PaisaPilot",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  };
}

