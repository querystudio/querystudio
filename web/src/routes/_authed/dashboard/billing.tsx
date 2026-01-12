import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, ExternalLink, Crown, Sparkles } from 'lucide-react'
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
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold'>Billing</h1>
        <p className='text-muted-foreground'>Manage your subscription and billing</p>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              {user.isPro ? (
                <div className='p-2 rounded-full bg-primary/10'>
                  <Crown className='h-5 w-5 text-primary' />
                </div>
              ) : (
                <div className='p-2 rounded-full bg-muted'>
                  <Sparkles className='h-5 w-5 text-muted-foreground' />
                </div>
              )}
              <div>
                <CardTitle className='text-xl'>{user.isPro ? 'Pro' : 'Free'}</CardTitle>
                <CardDescription>{user.isPro ? 'Lifetime access' : 'Basic features'}</CardDescription>
              </div>
            </div>
            <Badge variant={user.isPro ? 'default' : 'secondary'}>{user.isPro ? 'Active' : 'Current Plan'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {user.isPro ? (
            <div className='space-y-4'>
              <div className='flex flex-wrap gap-2'>
                <FeatureBadge>Unlimited connections</FeatureBadge>
                <FeatureBadge>Priority support</FeatureBadge>
                <FeatureBadge>Lifetime updates</FeatureBadge>
              </div>
              <Button variant='outline' onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>
                {portalMutation.isPending ? <Spinner className='h-4 w-4 mr-2' color='#101010' /> : <ExternalLink className='h-4 w-4 mr-2' />}
                Manage License
              </Button>
            </div>
          ) : (
            <div className='space-y-4'>
              <p className='text-sm text-muted-foreground'>You're on the free plan with limited features.</p>
              <div className='p-4 rounded-lg bg-muted/50 border'>
                <div className='flex items-center justify-between mb-3'>
                  <div>
                    <p className='font-medium'>Upgrade to Pro</p>
                    <p className='text-sm text-muted-foreground'>One-time payment, lifetime access</p>
                  </div>
                  <div className='text-right'>
                    <p className='text-2xl font-bold'>${pricing.tiers.pro.earlyBirdPrice}</p>
                    <p className='text-sm text-muted-foreground line-through'>${pricing.tiers.pro.price}</p>
                  </div>
                </div>
                <div className='flex flex-wrap gap-2 mb-4'>
                  <FeatureBadge>Unlimited connections</FeatureBadge>
                  <FeatureBadge>Priority support</FeatureBadge>
                  <FeatureBadge>Lifetime updates</FeatureBadge>
                </div>
                <Button className='w-full' onClick={() => createCheckoutMutation.mutate()} disabled={createCheckoutMutation.isPending}>
                  {createCheckoutMutation.isPending ? <Spinner className='h-4 w-4 mr-2' /> : null}
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FeatureBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className='inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full'>
      <Check className='h-3 w-3' />
      {children}
    </span>
  )
}
