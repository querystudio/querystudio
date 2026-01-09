import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

export const Route = createFileRoute('/_authed/dashboard/billing')({
  component: BillingPage,
})

function BillingPage() {
  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold'>Billing</h1>
        <p className='text-muted-foreground'>Manage your subscription and billing</p>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>You are currently on the free plan</CardDescription>
            </div>
            <Badge variant='secondary'>Free</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Check className='h-4 w-4 text-green-500' />
              <span>Up to 3 database connections</span>
            </div>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Check className='h-4 w-4 text-green-500' />
              <span>Basic SQL editor</span>
            </div>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Check className='h-4 w-4 text-green-500' />
              <span>Community support</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upgrade to Pro</CardTitle>
          <CardDescription>Unlock all features and get priority support</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-baseline gap-1'>
            <span className='text-3xl font-bold'>$12</span>
            <span className='text-muted-foreground'>/month</span>
          </div>
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-sm'>
              <Check className='h-4 w-4 text-green-500' />
              <span>Unlimited database connections</span>
            </div>
            <div className='flex items-center gap-2 text-sm'>
              <Check className='h-4 w-4 text-green-500' />
              <span>AI-powered query assistant</span>
            </div>
            <div className='flex items-center gap-2 text-sm'>
              <Check className='h-4 w-4 text-green-500' />
              <span>Advanced data visualization</span>
            </div>
            <div className='flex items-center gap-2 text-sm'>
              <Check className='h-4 w-4 text-green-500' />
              <span>Priority email support</span>
            </div>
            <div className='flex items-center gap-2 text-sm'>
              <Check className='h-4 w-4 text-green-500' />
              <span>Query history & saved queries</span>
            </div>
          </div>
          <Button className='w-full'>Upgrade to Pro</Button>
        </CardContent>
      </Card>

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
