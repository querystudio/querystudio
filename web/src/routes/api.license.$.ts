import { createFileRoute } from '@tanstack/react-router'
import { Hono } from 'hono/tiny'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { cors } from 'hono/cors'
import { db } from 'drizzle'
import { eq, and, count } from 'drizzle-orm'
import { user as userTable } from 'drizzle/schema/auth'
import { device as deviceTable, osTypeEnum } from 'drizzle/schema/device'
import { polar } from '@/lib/polar'
import { env } from '@/lib/env'

const MAX_ACTIVE_DEVICES = 2

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'QueryStudio License API',
    description: 'API for managing device licenses and activations for QueryStudio desktop app',
    version: '1.0.0',
  },
  servers: [{ url: '/api/license' }],
  paths: {
    '/activate': {
      post: {
        summary: 'Activate a device',
        description: 'Activate a new device with a license key. Returns a device token for future verification.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['licenseKey', 'deviceName'],
                properties: {
                  licenseKey: { type: 'string', description: 'Your license key' },
                  deviceName: { type: 'string', description: 'Name for this device' },
                  osType: { type: 'string', enum: ['ios', 'android', 'macos', 'windows', 'linux'], description: 'Operating system type' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Device activated successfully' },
          '401': { description: 'Invalid license key' },
          '403': { description: 'Not a Pro user or max devices reached' },
        },
      },
    },
    '/verify': {
      post: {
        summary: 'Verify device by token',
        description: 'Verify a device using its device token. Updates last seen timestamp.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['deviceToken'],
                properties: {
                  deviceToken: { type: 'string', description: 'Device token from activation' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Device is valid and active' },
          '401': { description: 'Invalid device token' },
          '403': { description: 'Device deactivated or license revoked' },
        },
      },
    },
    '/check': {
      post: {
        summary: 'Check license status',
        description: 'Check if a license key is valid without device context.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['licenseKey'],
                properties: {
                  licenseKey: { type: 'string', description: 'Your license key' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'License status and device info' },
          '401': { description: 'Invalid license key' },
          '403': { description: 'License revoked or not Pro' },
        },
      },
    },
    '/deactivate': {
      post: {
        summary: 'Deactivate device by token',
        description: 'Deactivate the current device using its token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['deviceToken'],
                properties: {
                  deviceToken: { type: 'string', description: 'Device token from activation' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Device deactivated' },
          '401': { description: 'Invalid device token' },
        },
      },
    },
    '/devices': {
      get: {
        summary: 'List devices',
        description: 'List all devices for a license key.',
        parameters: [
          {
            name: 'licenseKey',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Your license key',
          },
        ],
        responses: {
          '200': { description: 'List of devices' },
          '401': { description: 'Invalid license key' },
        },
      },
    },
  },
}

// Validate license key with Polar API
async function validateLicenseWithPolar(licenseKey: string): Promise<{
  valid: boolean
  error?: string
  status?: string
}> {
  try {
    const result = await polar.licenseKeys.validate({
      key: licenseKey,
      organizationId: env.POLAR_ORGANIZATION_ID,
    })

    // Check if license is valid and not revoked
    if (!result) {
      return { valid: false, error: 'License key not found' }
    }

    const status = (result as { status?: string }).status

    if (status === 'revoked') {
      return { valid: false, error: 'License key has been revoked', status }
    }

    if (status === 'disabled') {
      return { valid: false, error: 'License key has been disabled', status }
    }

    return { valid: true, status }
  } catch (error) {
    console.error('[License API] Polar validation error:', error)

    // Check if it's a 404 (key not found)
    if (error instanceof Error && error.message.includes('404')) {
      return { valid: false, error: 'License key not found' }
    }

    // For other errors, we may want to fail open or closed depending on your preference
    // Here we fail closed (deny access if we can't verify)
    return { valid: false, error: 'Unable to verify license key with Polar' }
  }
}

const app = new Hono()
  .basePath('/api/license')
  .use('*', cors())

  // OpenAPI spec
  .get('/openapi.json', (c) => c.json(openApiSpec))

  // Activate a device with license key
  .post(
    '/activate',
    zValidator(
      'json',
      z.object({
        licenseKey: z.string().min(1),
        deviceName: z.string().min(1),
        osType: z.enum(osTypeEnum.enumValues).optional(),
      }),
    ),
    async (c) => {
      const { licenseKey, deviceName, osType } = c.req.valid('json')

      // Validate license key with Polar first
      const polarValidation = await validateLicenseWithPolar(licenseKey)
      if (!polarValidation.valid) {
        return c.json({ error: polarValidation.error, status: polarValidation.status }, 401)
      }

      // Find user by license key
      const user = await db.query.user.findFirst({
        where: eq(userTable.licenseKey, licenseKey),
      })

      if (!user) {
        return c.json({ error: 'License key not associated with any user' }, 401)
      }

      if (!user.isPro) {
        return c.json({ error: 'License key is not associated with a Pro account' }, 403)
      }

      // Count active devices for this user
      const [activeDevicesResult] = await db
        .select({ count: count() })
        .from(deviceTable)
        .where(and(eq(deviceTable.userId, user.id), eq(deviceTable.active, true)))

      const activeDeviceCount = activeDevicesResult?.count ?? 0

      if (activeDeviceCount >= MAX_ACTIVE_DEVICES) {
        return c.json(
          {
            error: `Maximum number of active devices (${MAX_ACTIVE_DEVICES}) reached. Please deactivate a device first.`,
            activeDevices: activeDeviceCount,
            maxDevices: MAX_ACTIVE_DEVICES,
          },
          403,
        )
      }

      // Create new device
      const [newDevice] = await db
        .insert(deviceTable)
        .values({
          name: deviceName,
          userId: user.id,
          osType: osType ?? null,
          licenseKey,
          active: true,
          lastSeenAt: new Date(),
        })
        .returning()

      return c.json({
        success: true,
        device: {
          id: newDevice.id,
          name: newDevice.name,
          deviceToken: newDevice.deviceToken,
          active: newDevice.active,
        },
        message: 'Device activated successfully',
      })
    },
  )

  // Verify device by token
  .post(
    '/verify',
    zValidator(
      'json',
      z.object({
        deviceToken: z.string().min(1),
      }),
    ),
    async (c) => {
      const { deviceToken } = c.req.valid('json')

      // Find device by token
      const device = await db.query.device.findFirst({
        where: eq(deviceTable.deviceToken, deviceToken),
        with: { user: true },
      })

      if (!device) {
        return c.json({ error: 'Invalid device token' }, 401)
      }

      if (!device.active) {
        return c.json({ error: 'Device has been deactivated' }, 403)
      }

      if (!device.user.isPro) {
        return c.json({ error: 'User is no longer a Pro subscriber' }, 403)
      }

      // Validate license key with Polar
      const polarValidation = await validateLicenseWithPolar(device.licenseKey)
      if (!polarValidation.valid) {
        // Optionally deactivate the device if license is revoked
        if (polarValidation.status === 'revoked' || polarValidation.status === 'disabled') {
          await db.update(deviceTable).set({ active: false }).where(eq(deviceTable.id, device.id))
        }
        return c.json({ error: polarValidation.error, status: polarValidation.status }, 403)
      }

      // Update last seen
      await db.update(deviceTable).set({ lastSeenAt: new Date() }).where(eq(deviceTable.id, device.id))

      return c.json({
        valid: true,
        device: {
          id: device.id,
          name: device.name,
          active: device.active,
        },
        user: {
          id: device.user.id,
          name: device.user.name,
          isPro: device.user.isPro,
        },
      })
    },
  )

  // Verify device by license key (alternative verification method)
  .post(
    '/verify-license',
    zValidator(
      'json',
      z.object({
        licenseKey: z.string().min(1),
        deviceId: z.string().min(1),
      }),
    ),
    async (c) => {
      const { licenseKey, deviceId } = c.req.valid('json')

      // Validate license key with Polar first
      const polarValidation = await validateLicenseWithPolar(licenseKey)
      if (!polarValidation.valid) {
        return c.json({ error: polarValidation.error, status: polarValidation.status }, 401)
      }

      // Find user by license key
      const user = await db.query.user.findFirst({
        where: eq(userTable.licenseKey, licenseKey),
      })

      if (!user) {
        return c.json({ error: 'Invalid license key' }, 401)
      }

      if (!user.isPro) {
        return c.json({ error: 'User is no longer a Pro subscriber' }, 403)
      }

      // Find device
      const device = await db.query.device.findFirst({
        where: and(eq(deviceTable.id, deviceId), eq(deviceTable.userId, user.id), eq(deviceTable.licenseKey, licenseKey)),
      })

      if (!device) {
        return c.json({ error: 'Device not found or does not belong to this license' }, 404)
      }

      if (!device.active) {
        return c.json({ error: 'Device has been deactivated' }, 403)
      }

      // Update last seen
      await db.update(deviceTable).set({ lastSeenAt: new Date() }).where(eq(deviceTable.id, device.id))

      return c.json({
        valid: true,
        device: {
          id: device.id,
          name: device.name,
          active: device.active,
        },
        user: {
          id: user.id,
          name: user.name,
          isPro: user.isPro,
        },
      })
    },
  )

  // Deactivate a device by token (from the device itself)
  .post(
    '/deactivate',
    zValidator(
      'json',
      z.object({
        deviceToken: z.string().min(1),
      }),
    ),
    async (c) => {
      const { deviceToken } = c.req.valid('json')

      const device = await db.query.device.findFirst({
        where: eq(deviceTable.deviceToken, deviceToken),
      })

      if (!device) {
        return c.json({ error: 'Invalid device token' }, 401)
      }

      // Deactivate the device
      await db.update(deviceTable).set({ active: false }).where(eq(deviceTable.id, device.id))

      return c.json({
        success: true,
        message: 'Device deactivated successfully',
      })
    },
  )

  // Deactivate a device by ID (from the web dashboard, requires license key)
  .post(
    '/deactivate-device',
    zValidator(
      'json',
      z.object({
        licenseKey: z.string().min(1),
        deviceId: z.string().min(1),
      }),
    ),
    async (c) => {
      const { licenseKey, deviceId } = c.req.valid('json')

      // Verify license key belongs to a user
      const user = await db.query.user.findFirst({
        where: eq(userTable.licenseKey, licenseKey),
      })

      if (!user) {
        return c.json({ error: 'Invalid license key' }, 401)
      }

      // Find device and verify it belongs to this user
      const device = await db.query.device.findFirst({
        where: and(eq(deviceTable.id, deviceId), eq(deviceTable.userId, user.id)),
      })

      if (!device) {
        return c.json({ error: 'Device not found or does not belong to this license' }, 404)
      }

      // Deactivate the device
      await db.update(deviceTable).set({ active: false }).where(eq(deviceTable.id, device.id))

      return c.json({
        success: true,
        message: 'Device deactivated successfully',
      })
    },
  )

  // List all devices for a license key
  .get(
    '/devices',
    zValidator(
      'query',
      z.object({
        licenseKey: z.string().min(1),
      }),
    ),
    async (c) => {
      const { licenseKey } = c.req.valid('query')

      // Validate license key with Polar
      const polarValidation = await validateLicenseWithPolar(licenseKey)

      const user = await db.query.user.findFirst({
        where: eq(userTable.licenseKey, licenseKey),
      })

      if (!user) {
        return c.json({ error: 'Invalid license key' }, 401)
      }

      const devices = await db.query.device.findMany({
        where: eq(deviceTable.userId, user.id),
        orderBy: (device, { desc }) => [desc(device.lastSeenAt)],
      })

      const activeCount = devices.filter((d) => d.active).length

      return c.json({
        devices: devices.map((d) => ({
          id: d.id,
          name: d.name,
          osType: d.osType,
          active: d.active,
          lastSeenAt: d.lastSeenAt,
          createdAt: d.createdAt,
        })),
        activeCount,
        maxDevices: MAX_ACTIVE_DEVICES,
        isPro: user.isPro,
        licenseStatus: polarValidation.valid ? 'active' : polarValidation.status,
        licenseValid: polarValidation.valid,
      })
    },
  )

  // Delete a device permanently (remove from database)
  .delete(
    '/device',
    zValidator(
      'json',
      z.object({
        licenseKey: z.string().min(1),
        deviceId: z.string().min(1),
      }),
    ),
    async (c) => {
      const { licenseKey, deviceId } = c.req.valid('json')

      const user = await db.query.user.findFirst({
        where: eq(userTable.licenseKey, licenseKey),
      })

      if (!user) {
        return c.json({ error: 'Invalid license key' }, 401)
      }

      const device = await db.query.device.findFirst({
        where: and(eq(deviceTable.id, deviceId), eq(deviceTable.userId, user.id)),
      })

      if (!device) {
        return c.json({ error: 'Device not found or does not belong to this license' }, 404)
      }

      await db.delete(deviceTable).where(eq(deviceTable.id, device.id))

      return c.json({
        success: true,
        message: 'Device deleted successfully',
      })
    },
  )

  // Check license status without device context (useful for initial app check)
  .post(
    '/check',
    zValidator(
      'json',
      z.object({
        licenseKey: z.string().min(1),
      }),
    ),
    async (c) => {
      const { licenseKey } = c.req.valid('json')

      // Validate with Polar
      const polarValidation = await validateLicenseWithPolar(licenseKey)

      // Find user
      const user = await db.query.user.findFirst({
        where: eq(userTable.licenseKey, licenseKey),
      })

      if (!user) {
        return c.json(
          {
            valid: false,
            error: 'License key not associated with any user',
            polarStatus: polarValidation.status,
          },
          401,
        )
      }

      if (!polarValidation.valid) {
        return c.json(
          {
            valid: false,
            error: polarValidation.error,
            polarStatus: polarValidation.status,
            isPro: user.isPro,
          },
          403,
        )
      }

      if (!user.isPro) {
        return c.json(
          {
            valid: false,
            error: 'User is not a Pro subscriber',
            polarStatus: polarValidation.status,
            isPro: false,
          },
          403,
        )
      }

      // Count active devices
      const [activeDevicesResult] = await db
        .select({ count: count() })
        .from(deviceTable)
        .where(and(eq(deviceTable.userId, user.id), eq(deviceTable.active, true)))

      const activeDeviceCount = activeDevicesResult?.count ?? 0

      return c.json({
        valid: true,
        polarStatus: polarValidation.status,
        isPro: user.isPro,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        activeDevices: activeDeviceCount,
        maxDevices: MAX_ACTIVE_DEVICES,
        canActivateNewDevice: activeDeviceCount < MAX_ACTIVE_DEVICES,
      })
    },
  )

export const Route = createFileRoute('/api/license/$')({
  server: {
    handlers: {
      GET: ({ request }) => app.fetch(request),
      POST: ({ request }) => app.fetch(request),
      DELETE: ({ request }) => app.fetch(request),
    },
  },
})
