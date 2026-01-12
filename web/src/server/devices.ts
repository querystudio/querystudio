import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { db } from 'drizzle'
import { eq, and, count } from 'drizzle-orm'
import { user as userTable } from 'drizzle/schema/auth'
import { device as deviceTable } from 'drizzle/schema/device'
import { polar } from '@/lib/polar'
import { env } from '@/lib/env'
import z from 'zod'

const MAX_ACTIVE_DEVICES = 2

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
    console.error('[Devices] Polar validation error:', error)

    if (error instanceof Error && error.message.includes('404')) {
      return { valid: false, error: 'License key not found' }
    }

    return { valid: false, error: 'Unable to verify license key with Polar' }
  }
}

// Get current user's devices
export const getDevicesFn = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    throw new Error('Unauthorized')
  }

  const user = await db.query.user.findFirst({
    where: eq(userTable.id, session.user.id),
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Check license status with Polar if user has a license key
  let licenseStatus: { valid: boolean; status?: string; error?: string } = {
    valid: false,
    error: 'No license key',
  }

  if (user.licenseKey) {
    licenseStatus = await validateLicenseWithPolar(user.licenseKey)
  }

  const devices = await db.query.device.findMany({
    where: eq(deviceTable.userId, session.user.id),
    orderBy: (device, { desc }) => [desc(device.lastSeenAt)],
  })

  const activeCount = devices.filter((d) => d.active).length

  return {
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
    isPro: user.isPro ?? false,
    hasLicenseKey: !!user.licenseKey,
    licenseValid: licenseStatus.valid,
    licenseStatus: licenseStatus.status,
    licenseError: licenseStatus.error,
  }
})

// Deactivate a device
export const deactivateDeviceFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ deviceId: z.string() }))
  .handler(async ({ data }: { data: { deviceId: string } }) => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      throw new Error('Unauthorized')
    }

    const { deviceId } = data

    // Find device and verify ownership
    const device = await db.query.device.findFirst({
      where: and(eq(deviceTable.id, deviceId), eq(deviceTable.userId, session.user.id)),
    })

    if (!device) {
      throw new Error('Device not found')
    }

    // Deactivate the device
    await db.update(deviceTable).set({ active: false }).where(eq(deviceTable.id, deviceId))

    return { success: true }
  })

// Reactivate a device
export const reactivateDeviceFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ deviceId: z.string() }))
  .handler(async ({ data }: { data: { deviceId: string } }) => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      throw new Error('Unauthorized')
    }

    const { deviceId } = data

    // Get user to check license
    const user = await db.query.user.findFirst({
      where: eq(userTable.id, session.user.id),
    })

    if (!user || !user.isPro) {
      throw new Error('Pro subscription required')
    }

    if (!user.licenseKey) {
      throw new Error('No license key found')
    }

    // Validate license with Polar
    const polarValidation = await validateLicenseWithPolar(user.licenseKey)
    if (!polarValidation.valid) {
      throw new Error(polarValidation.error || 'License validation failed')
    }

    // Find device and verify ownership
    const device = await db.query.device.findFirst({
      where: and(eq(deviceTable.id, deviceId), eq(deviceTable.userId, session.user.id)),
    })

    if (!device) {
      throw new Error('Device not found')
    }

    // Check active device count
    const [activeDevicesResult] = await db
      .select({ count: count() })
      .from(deviceTable)
      .where(and(eq(deviceTable.userId, session.user.id), eq(deviceTable.active, true)))

    const activeDeviceCount = activeDevicesResult?.count ?? 0

    if (activeDeviceCount >= MAX_ACTIVE_DEVICES) {
      throw new Error(`Maximum number of active devices (${MAX_ACTIVE_DEVICES}) reached`)
    }

    // Reactivate the device
    await db.update(deviceTable).set({ active: true, lastSeenAt: new Date() }).where(eq(deviceTable.id, deviceId))

    return { success: true }
  })

// Delete a device permanently
export const deleteDeviceFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ deviceId: z.string() }))
  .handler(async ({ data }: { data: { deviceId: string } }) => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      throw new Error('Unauthorized')
    }

    const { deviceId } = data

    // Find device and verify ownership
    const device = await db.query.device.findFirst({
      where: and(eq(deviceTable.id, deviceId), eq(deviceTable.userId, session.user.id)),
    })

    if (!device) {
      throw new Error('Device not found')
    }

    // Delete the device
    await db.delete(deviceTable).where(eq(deviceTable.id, deviceId))

    return { success: true }
  })

// Rename a device
export const renameDeviceFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ deviceId: z.string(), name: z.string().min(1).max(100) }))
  .handler(async ({ data }: { data: { deviceId: string; name: string } }) => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      throw new Error('Unauthorized')
    }

    const { deviceId, name } = data

    // Find device and verify ownership
    const device = await db.query.device.findFirst({
      where: and(eq(deviceTable.id, deviceId), eq(deviceTable.userId, session.user.id)),
    })

    if (!device) {
      throw new Error('Device not found')
    }

    // Rename the device
    await db.update(deviceTable).set({ name }).where(eq(deviceTable.id, deviceId))

    return { success: true }
  })
