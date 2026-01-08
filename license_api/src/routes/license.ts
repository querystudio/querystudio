import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  validateLicenseKey,
  activateLicense,
  deactivateLicense,
  getLicenseById,
} from "../polar.ts";

const licenseRoutes = new Hono();

// Validate license key
const validateSchema = z.object({
  licenseKey: z.string().min(1, "License key is required"),
});

licenseRoutes.post("/validate", zValidator("json", validateSchema), async (c) => {
  const { licenseKey } = c.req.valid("json");

  const result = await validateLicenseKey(licenseKey);

  if (!result.valid) {
    return c.json(
      {
        valid: false,
        error: result.error ?? "Invalid license key",
      },
      400
    );
  }

  return c.json({
    valid: true,
    license: result.license,
  });
});

// Activate license
const activateSchema = z.object({
  licenseKey: z.string().min(1, "License key is required"),
  deviceId: z.string().min(1, "Device ID is required"),
  deviceName: z.string().optional(),
  meta: z.record(z.string(), z.string()).optional(),
});

licenseRoutes.post("/activate", zValidator("json", activateSchema), async (c) => {
  const { licenseKey, deviceId, deviceName, meta } = c.req.valid("json");

  // First validate the license
  const validation = await validateLicenseKey(licenseKey);
  if (!validation.valid) {
    return c.json(
      {
        success: false,
        error: validation.error ?? "Invalid license key",
      },
      400
    );
  }

  // Activate
  const result = await activateLicense(licenseKey, deviceName ?? deviceId, {
    deviceId,
    ...meta,
  });

  if (!result.success) {
    return c.json(
      {
        success: false,
        error: result.error,
      },
      400
    );
  }

  return c.json({
    success: true,
    activationId: result.activationId,
    license: validation.license,
  });
});

// Deactivate license
const deactivateSchema = z.object({
  licenseKey: z.string().min(1, "License key is required"),
  activationId: z.string().min(1, "Activation ID is required"),
});

licenseRoutes.post("/deactivate", zValidator("json", deactivateSchema), async (c) => {
  const { licenseKey, activationId } = c.req.valid("json");

  const result = await deactivateLicense(licenseKey, activationId);

  if (!result.success) {
    return c.json(
      {
        success: false,
        error: result.error,
      },
      400
    );
  }

  return c.json({
    success: true,
  });
});

// Get license by ID (for admin purposes)
const getLicenseSchema = z.object({
  id: z.string().min(1, "License ID is required"),
});

licenseRoutes.get("/:id", zValidator("param", getLicenseSchema), async (c) => {
  const { id } = c.req.valid("param");

  const license = await getLicenseById(id);

  if (!license) {
    return c.json(
      {
        error: "License not found",
      },
      404
    );
  }

  return c.json({
    license,
  });
});

export { licenseRoutes };
