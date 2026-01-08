import { Polar } from "@polar-sh/sdk";
import { env } from "./env.ts";

export const polar = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
});

export type LicenseStatus = "granted" | "revoked" | "disabled";

export interface LicenseInfo {
  id: string;
  key: string;
  displayKey: string;
  status: LicenseStatus;
  customerId: string;
  email: string;
  customerName: string | null;
  activationsCount: number;
  maxActivations: number | null;
  usage: number;
  maxUsage: number | null;
  validations: number;
  expiresAt: string | null;
  createdAt: string;
  benefitId: string;
}

export interface LicenseValidationResult {
  valid: boolean;
  license: LicenseInfo | null;
  error?: string;
}

export async function validateLicenseKey(
  licenseKey: string,
): Promise<LicenseValidationResult> {
  try {
    const result = await polar.licenseKeys.validate({
      organizationId: env.POLAR_ORGANIZATION_ID,
      key: licenseKey,
    });

    // Check if license is in a valid state
    const isValid = result.status === "granted";

    const license: LicenseInfo = {
      id: result.id,
      key: result.key,
      displayKey: result.displayKey,
      status: result.status as LicenseStatus,
      customerId: result.customerId,
      email: result.customer.email,
      customerName: result.customer.name,
      activationsCount: result.activation ? 1 : 0, // activation is the current one if provided
      maxActivations: result.limitActivations,
      usage: result.usage,
      maxUsage: result.limitUsage,
      validations: result.validations,
      expiresAt: result.expiresAt?.toISOString() ?? null,
      createdAt: result.createdAt.toISOString(),
      benefitId: result.benefitId,
    };

    return {
      valid: isValid,
      license,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error validating license key:", error);
    return { valid: false, license: null, error: message };
  }
}

export async function getLicenseByKey(
  licenseKey: string,
): Promise<LicenseInfo | null> {
  try {
    // First validate to get the license info (since we can't query by key directly)
    const result = await validateLicenseKey(licenseKey);
    return result.license;
  } catch (error) {
    console.error("Error getting license:", error);
    return null;
  }
}

export async function getLicenseById(
  licenseId: string,
): Promise<LicenseInfo | null> {
  try {
    const result = await polar.licenseKeys.get({
      id: licenseId,
    });

    return {
      id: result.id,
      key: result.key,
      displayKey: result.displayKey,
      status: result.status as LicenseStatus,
      customerId: result.customerId,
      email: result.customer.email,
      customerName: result.customer.name,
      activationsCount: result.activations.length,
      maxActivations: result.limitActivations,
      usage: result.usage,
      maxUsage: result.limitUsage,
      validations: result.validations,
      expiresAt: result.expiresAt?.toISOString() ?? null,
      createdAt: result.createdAt.toISOString(),
      benefitId: result.benefitId,
    };
  } catch (error) {
    console.error("Error getting license by ID:", error);
    return null;
  }
}

export interface ActivationResult {
  success: boolean;
  activationId?: string;
  error?: string;
}

export async function activateLicense(
  licenseKey: string,
  label: string,
  meta?: Record<string, string>,
): Promise<ActivationResult> {
  try {
    const result = await polar.licenseKeys.activate({
      organizationId: env.POLAR_ORGANIZATION_ID,
      key: licenseKey,
      label,
      meta: meta ?? {},
    });

    return {
      success: true,
      activationId: result.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error activating license:", error);
    return { success: false, error: message };
  }
}

export async function deactivateLicense(
  licenseKey: string,
  activationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await polar.licenseKeys.deactivate({
      organizationId: env.POLAR_ORGANIZATION_ID,
      key: licenseKey,
      activationId,
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error deactivating license:", error);
    return { success: false, error: message };
  }
}
