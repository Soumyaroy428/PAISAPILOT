/**
 * Server-Side Feature Flag Management for PaisaPilot
 *
 * Non-negotiable rule: Bank synchronization features remain strictly disabled
 * until authorized provider eligibility, onboarding, and compliance gates pass.
 */

export interface FeatureFlags {
  bankSyncEnabled: boolean;
}

/**
 * Returns current server-side feature flags evaluated from environment variables.
 * Defaults to strictly `false` for bank sync in all environments unless explicitly enabled.
 */
export function getFeatureFlags(): FeatureFlags {
  const envVal =
    process.env.FEATURE_BANK_SYNC ||
    process.env.ENABLE_BANK_SYNC ||
    process.env.NEXT_PUBLIC_ENABLE_BANK_SYNC;

  const isExplicitlyEnabled =
    envVal === "true" || envVal === "1" || envVal === "yes";

  return {
    bankSyncEnabled: isExplicitlyEnabled,
  };
}

export function isBankSyncEnabled(): boolean {
  return getFeatureFlags().bankSyncEnabled;
}

