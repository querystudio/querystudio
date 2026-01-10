import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Infinity as InfinityIcon } from 'lucide-react'
import { getPricing } from '@/server/pricing'
import { useMutation } from '@tanstack/react-query'
import { createCheckout } from '@/server/billing'
import { toast } from 'sonner'
import Spinner from '@/components/ui/spinner'

export const Route = createFileRoute('/_authed/dashboard/billing')({
  component: BillingPage,
  loader: () => getPricing(),
})

function BillingPage() {
  const { user } = Route.useRouteContext()
  const pricing = Route.useLoaderData()

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

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold'>Billing</h1>
        <p className='text-muted-foreground'>Manage your subscription and billing</p>
      </div>

      <div className='grid md:grid-cols-2 gap-6'>
        {/* Free Tier - Current Plan */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-xl'>{pricing.tiers.free.name}</CardTitle>
              <Badge variant='secondary'>Current Plan</Badge>
            </div>
            <CardDescription>Perfect for getting started</CardDescription>
            <div className='mt-4'>
              <span className='text-3xl font-bold'>${pricing.tiers.free.price}</span>
              <span className='text-muted-foreground ml-2'>forever</span>
            </div>
          </CardHeader>
          <CardContent className='space-y-3'>
            <FeatureItem>{pricing.tiers.free.features.maxConnections} database connection</FeatureItem>
            <FeatureItem>{pricing.tiers.free.features.dialects.map((d) => capitalize(d)).join(' & ')} support</FeatureItem>
            <FeatureItem>SQL query runner</FeatureItem>
            <FeatureItem>Auto-complete</FeatureItem>
            <FeatureItem>AI assistant (bring your own key)</FeatureItem>
          </CardContent>
        </Card>

        {/* Pro Tier */}
        <Card className='relative border-primary'>
          <div className='absolute -top-3 left-1/2 -translate-x-1/2'>
            <span className='bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full'>Early Bird</span>
          </div>
          <CardHeader>
            <CardTitle className='text-xl'>{pricing.tiers.pro.name}</CardTitle>
            <CardDescription>For power users and teams</CardDescription>
            <div className='mt-4'>
              <span className='text-3xl font-bold'>${pricing.tiers.pro.earlyBirdPrice}</span>
              <span className='text-muted-foreground ml-2 line-through'>${pricing.tiers.pro.price}</span>
              <span className='text-muted-foreground ml-2'>one-time</span>
            </div>
            <p className='text-sm text-green-600 dark:text-green-400 mt-1'>Save 70% during beta!</p>
          </CardHeader>
          <CardContent className='space-y-3'>
            <FeatureItem>
              <InfinityIcon className='h-4 w-4 inline mr-1' />
              Unlimited connections
            </FeatureItem>
            <FeatureItem>{pricing.tiers.pro.features.dialects.map((d) => capitalize(d)).join(', ')} support</FeatureItem>
            <FeatureItem>SQL query runner</FeatureItem>
            <FeatureItem>Auto-complete</FeatureItem>
            <FeatureItem>AI assistant (bring your own key)</FeatureItem>
            <FeatureItem>Priority support</FeatureItem>
            <FeatureItem>Lifetime updates</FeatureItem>
          </CardContent>
          <CardFooter>
            <Button className='w-full' onClick={() => createCheckoutMutation.mutate()} disabled={createCheckoutMutation.isPending || user.isPro!}>
              {createCheckoutMutation.isPending ? <Spinner /> : 'Upgrade to Pro'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* AI Note */}
      <Card className='bg-muted/50'>
        <CardContent className='pt-6'>
          <h3 className='font-semibold mb-2'>Bring Your Own API Key</h3>
          <p className='text-sm text-muted-foreground'>
            QueryStudio's AI features work with your own API keys from {pricing.ai.supportedProviders.map((p) => capitalize(p)).join(', ')}. Your data stays private and you only pay for what you use
            directly to the provider.
          </p>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View your past invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8 text-muted-foreground'>
            <p>No billing history yet</p>
            <p className='text-sm'>Your invoices will appear here once you upgrade</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex items-center gap-3'>
      <Check className='h-4 w-4 text-green-500 flex-shrink-0' />
      <span className='text-sm'>{children}</span>
    </div>
  )
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
