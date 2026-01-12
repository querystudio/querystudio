import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Check, ExternalLink } from 'lucide-react'
import { getPricing } from '@/server/pricing'
import { useMutation } from '@tanstack/react-query'
import { createCheckout, createCustomerPortal } from '@/server/billing'
import { toast } from 'sonner'
import Spinner from '@/components/ui/spinner'

export const Route = createFileRoute('/_authed/dashboard/billing')({
  component: BillingPage,
  loader: async () => {
    const pricing = await getPricing()
    return { pricing }
  },
})

function BillingPage() {
  const { user } = Route.useRouteContext()
  const { pricing } = Route.useLoaderData()

  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      return await createCheckout()
    },
    onSuccess: (data) => {
      return window.location.replace(data.url)
    },
    onError: (err) => {
      toast.error('Error!', { description: err.message })
    },
  })

  const portalMutation = useMutation({
    mutationFn: async () => {
      return await createCustomerPortal()
    },
    onSuccess: (data) => {
      window.open(data.url, '_blank')
    },
    onError: (err) => {
      toast.error('Failed to open customer portal', { description: err.message })
    },
  })

  return (
    <div className='max-w-lg'>
      <h1 className='text-xl font-semibold mb-1'>Billing</h1>
      <p className='text-sm text-muted-foreground mb-6'>Manage your subscription</p>

      <div className='border rounded-lg p-5'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h2 className='font-medium'>{user.isPro ? 'Pro' : 'Free'}</h2>
            <p className='text-sm text-muted-foreground'>{user.isPro ? 'Lifetime access' : 'Basic features'}</p>
          </div>
          <span className='text-xs bg-muted px-2 py-1 rounded'>{user.isPro ? 'Active' : 'Current'}</span>
        </div>

        {user.isPro ? (
          <div className='space-y-4'>
            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li className='flex items-center gap-2'>
                <Check className='h-4 w-4 text-foreground' />
                Unlimited connections
              </li>
              <li className='flex items-center gap-2'>
                <Check className='h-4 w-4 text-foreground' />
                Priority support
              </li>
              <li className='flex items-center gap-2'>
                <Check className='h-4 w-4 text-foreground' />
                Lifetime updates
              </li>
            </ul>
            <Button variant='outline' size='sm' onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>
              {portalMutation.isPending ? <Spinner className='h-4 w-4 mr-2' color='#101010' /> : <ExternalLink className='h-4 w-4 mr-2' />}
              Manage License
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            <p className='text-sm text-muted-foreground'>Upgrade to unlock all features.</p>

            <div className='border rounded p-4'>
              <div className='flex items-center justify-between mb-3'>
                <span className='font-medium'>Pro</span>
                <div className='text-right'>
                  <span className='font-semibold'>${pricing.tiers.pro.earlyBirdPrice}</span>
                  <span className='text-sm text-muted-foreground line-through ml-2'>${pricing.tiers.pro.price}</span>
                </div>
              </div>
              <ul className='space-y-1 text-sm text-muted-foreground mb-4'>
                <li className='flex items-center gap-2'>
                  <Check className='h-3 w-3' />
                  Unlimited connections
                </li>
                <li className='flex items-center gap-2'>
                  <Check className='h-3 w-3' />
                  Priority support
                </li>
                <li className='flex items-center gap-2'>
                  <Check className='h-3 w-3' />
                  Lifetime updates
                </li>
              </ul>
              <Button className='w-full' size='sm' onClick={() => createCheckoutMutation.mutate()} disabled={createCheckoutMutation.isPending}>
                {createCheckoutMutation.isPending && <Spinner className='h-4 w-4 mr-2' />}
                Upgrade
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
