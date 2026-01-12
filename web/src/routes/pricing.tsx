import { createFileRoute, Link } from '@tanstack/react-router'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { getPricing } from '@/server/pricing'

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
  loader: () => getPricing(),
})

function PricingPage() {
  const pricing = Route.useLoaderData()

  return (
    <div className='min-h-screen bg-background'>
      <Header />

      <section className='container mx-auto px-4 py-16'>
        <div className='max-w-2xl mx-auto'>
          <h1 className='text-2xl font-semibold mb-2'>Pricing</h1>
          <p className='text-muted-foreground mb-8'>Start free, pay once for unlimited use.</p>

          <div className='grid md:grid-cols-2 gap-6'>
            {/* Free */}
            <div className='border rounded-lg p-6'>
              <div className='mb-4'>
                <h2 className='font-medium'>{pricing.tiers.free.name}</h2>
                <p className='text-2xl font-semibold mt-1'>${pricing.tiers.free.price}</p>
                <p className='text-sm text-muted-foreground'>Free forever</p>
              </div>
              <ul className='space-y-2 text-sm text-muted-foreground mb-6'>
                <li className='flex items-center gap-2'>
                  <Check className='h-4 w-4 text-foreground' />
                  {pricing.tiers.free.features.maxConnections} connections
                </li>
                <li className='flex items-center gap-2'>
                  <Check className='h-4 w-4 text-foreground' />
                  All features
                </li>
                <li className='flex items-center gap-2'>
                  <Check className='h-4 w-4 text-foreground' />
                  All database dialects
                </li>
                <li className='flex items-center gap-2'>
                  <Check className='h-4 w-4 text-foreground' />
                  AI assistant (BYOK)
                </li>
              </ul>
              <Button variant='outline' className='w-full' asChild>
                <Link to='/download'>Download</Link>
              </Button>
            </div>

            {/* Pro */}
            <div className='border rounded-lg p-6'>
              <div className='mb-4'>
                <div className='flex items-center gap-2'>
                  <h2 className='font-medium'>{pricing.tiers.pro.name}</h2>
                  <span className='text-xs bg-muted px-2 py-0.5 rounded'>Early Bird</span>
                </div>
                <div className='flex items-baseline gap-2 mt-1'>
                  <p className='text-2xl font-semibold'>${pricing.tiers.pro.earlyBirdPrice}</p>
                  <p className='text-sm text-muted-foreground line-through'>${pricing.tiers.pro.price}</p>
                </div>
                <p className='text-sm text-muted-foreground'>One-time payment</p>
              </div>
              <ul className='space-y-2 text-sm text-muted-foreground mb-6'>
                <li className='flex items-center gap-2'>
                  <Check className='h-4 w-4 text-foreground' />
                  Unlimited connections
                </li>
                <li className='flex items-center gap-2'>
                  <Check className='h-4 w-4 text-foreground' />
                  All features
                </li>
                <li className='flex items-center gap-2'>
                  <Check className='h-4 w-4 text-foreground' />
                  All database dialects
                </li>
                <li className='flex items-center gap-2'>
                  <Check className='h-4 w-4 text-foreground' />
                  AI assistant (BYOK)
                </li>
                <li className='flex items-center gap-2'>
                  <Check className='h-4 w-4 text-foreground' />
                  Priority support
                </li>
                <li className='flex items-center gap-2'>
                  <Check className='h-4 w-4 text-foreground' />2 devices
                </li>
              </ul>
              <Button className='w-full' asChild>
                <Link to='/dashboard/billing' search={{ upgrade: true }}>
                  Get Pro
                </Link>
              </Button>
            </div>
          </div>

          <div className='mt-12 border rounded-lg p-6'>
            <h2 className='font-medium mb-2'>FAQ</h2>
            <div className='space-y-4 text-sm'>
              <div>
                <p className='font-medium'>What does "BYOK" mean?</p>
                <p className='text-muted-foreground'>Bring Your Own Key. You use your own API key for AI features.</p>
              </div>
              <div>
                <p className='font-medium'>Is Pro really a one-time payment?</p>
                <p className='text-muted-foreground'>Yes. Pay once and use QueryStudio forever with all future updates included.</p>
              </div>
              <div>
                <p className='font-medium'>Can I upgrade later?</p>
                <p className='text-muted-foreground'>Yes, you can upgrade from Free to Pro at any time from your dashboard.</p>
              </div>
              <div>
                <p className='font-medium'>What databases are supported?</p>
                <p className='text-muted-foreground'>PostgreSQL, MySQL, SQLite, and more to come. All dialects are available on both plans.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className='container mx-auto px-4 py-8 border-t'>
        <p className='text-sm text-muted-foreground'>QueryStudio</p>
      </footer>
    </div>
  )
}
