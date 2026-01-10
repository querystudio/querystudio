import { auth } from '@/lib/auth'
import { env } from '@/lib/env'
import { polar } from '@/lib/polar'
import { ListResourceOrder } from '@polar-sh/sdk/models/components/listresourceorder.js'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { db } from 'drizzle'
import { eq } from 'drizzle-orm'
import { user as userTable } from 'drizzle/schema/auth'

export const createCheckout = createServerFn().handler(async () => {
  const req = getRequest()
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) throw new Error('Unauthorized')

  const { user } = session

  let customerId = ''

  if (!user.polarCustomerId) {
    const newCustomer = await polar.customers.create({ email: user.email, name: user.name })
    await db.update(userTable).set({ polarCustomerId: newCustomer.id }).where(eq(userTable.id, user.id))
    customerId = newCustomer.id
  } else {
    customerId = user.polarCustomerId
  }

  const checkout = await polar.checkouts.create({
    customerId,
    products: [env.POLAR_PRICING_ID],
    allowDiscountCodes: true,
    ...(env.POLAR_EARLY_BIRD_DISCOUNT && { discountId: env.POLAR_EARLY_BIRD_DISCOUNT }),
  })

  return { url: checkout.url }
})

export const getOrders = createServerFn().handler(async () => {
  const req = getRequest()
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) throw new Error('Unauthorized')

  const { user } = session

  if (!user.polarCustomerId) {
    return { items: [], pagination: { totalCount: 0, maxPage: 1 } } as ListResourceOrder
  }

  const orders = await polar.orders.list({ customerId: user.polarCustomerId })
  return orders.result
})

export const generateInvoice = createServerFn({ method: 'POST' })
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data }) => {
    const req = getRequest()
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) throw new Error('Unauthorized')

    const { user } = session
    if (!user.polarCustomerId) throw new Error('No customer ID')

    // First verify the order belongs to this customer
    const order = await polar.orders.get({ id: data.orderId })
    if (order.customerId !== user.polarCustomerId) {
      throw new Error('Unauthorized')
    }

    // Generate the invoice
    const invoice = await polar.orders.invoice({ id: data.orderId })
    return { url: invoice.url }
  })

export const requestRefund = createServerFn({ method: 'POST' })
  .inputValidator((data: { orderId: string; reason?: string }) => data)
  .handler(async ({ data }) => {
    const req = getRequest()
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) throw new Error('Unauthorized')

    const { user } = session
    if (!user.polarCustomerId) throw new Error('No customer ID')

    // Verify the order belongs to this customer
    const order = await polar.orders.get({ id: data.orderId })
    if (order.customerId !== user.polarCustomerId) {
      throw new Error('Unauthorized')
    }

    // Check if order can be refunded
    if (order.status === 'refunded') {
      throw new Error('Order has already been refunded')
    }

    if (order.status !== 'paid' && order.status !== 'partially_refunded') {
      throw new Error('Order is not eligible for refund')
    }

    const refundableAmount = order.totalAmount - order.refundedAmount

    if (refundableAmount <= 0) {
      throw new Error('No refundable amount remaining')
    }

    // Create the refund
    const refund = await polar.refunds.create({
      orderId: data.orderId,
      reason: 'customer_request',
      amount: refundableAmount,
    })

    if (!refund) {
      throw new Error('Failed to create refund')
    }

    // Update user's pro status if fully refunded
    await db.update(userTable).set({ isPro: false, licenseKey: null }).where(eq(userTable.id, user.id))

    return { success: true, refundId: refund.id }
  })
