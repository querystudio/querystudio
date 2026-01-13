import { createFileRoute, Link } from '@tanstack/react-router'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
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

      <main className='container mx-auto px-4 py-16 md:py-24'>
        <div className='max-w-2xl'>
          <h1 className='text-3xl font-semibold tracking-tight'>Pricing</h1>
          <p className='mt-2 text-muted-foreground'>Free to use. One-time payment for Pro.</p>
        </div>

        {/* Pricing table */}
        <div className='mt-12 max-w-3xl'>
          <table className='w-full'>
            <thead>
              <tr className='border-b text-left'>
                <th className='pb-4 font-medium'>Plan</th>
                <th className='pb-4 font-medium'>Connections</th>
                <th className='pb-4 font-medium'>Features</th>
                <th className='pb-4 font-medium text-right'>Price</th>
              </tr>
            </thead>
            <tbody className='text-sm'>
              <tr className='border-b'>
                <td className='py-4'>
                  <span className='font-medium'>{pricing.tiers.free.name}</span>
                </td>
                <td className='py-4 text-muted-foreground'>{pricing.tiers.free.features.maxConnections}</td>
                <td className='py-4 text-muted-foreground'>All features, AI assistant (BYOK)</td>
                <td className='py-4 text-right font-medium'>$0</td>
              </tr>
              <tr className='border-b'>
                <td className='py-4'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>{pricing.tiers.pro.name}</span>
                    <span className='text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded'>Early bird</span>
                  </div>
                </td>
                <td className='py-4 text-muted-foreground'>Unlimited</td>
                <td className='py-4 text-muted-foreground'>Everything in Free, priority support, 2 devices</td>
                <td className='py-4 text-right'>
                  <span className='font-medium'>${pricing.tiers.pro.earlyBirdPrice}</span>
                  <span className='ml-2 text-muted-foreground line-through'>${pricing.tiers.pro.price}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className='mt-8 flex gap-3'>
            <Button asChild>
              <Link to='/download'>
                <Download className='h-4 w-4 mr-2' />
                Download Free
              </Link>
            </Button>
            <Button variant='outline' asChild>
              <Link to='/dashboard/billing' search={{ upgrade: true }}>
                Get Pro
              </Link>
            </Button>
          </div>
        </div>

        {/* Details */}
        <div className='mt-20 max-w-2xl'>
          <h2 className='text-lg font-medium'>What's included</h2>
          <div className='mt-6 grid gap-8 sm:grid-cols-2'>
            <div>
              <h3 className='font-medium text-sm'>Database support</h3>
              <p className='mt-1 text-sm text-muted-foreground'>PostgreSQL, MySQL, and SQLite. More coming soon. Available on both plans.</p>
            </div>
            <div>
              <h3 className='font-medium text-sm'>AI assistant</h3>
              <p className='mt-1 text-sm text-muted-foreground'>Write queries in plain English. Bring your own OpenAI or Anthropic API key.</p>
            </div>
            <div>
              <h3 className='font-medium text-sm'>Local-first</h3>
              <p className='mt-1 text-sm text-muted-foreground'>Your data stays on your machine. Credentials stored in your system keychain.</p>
            </div>
            <div>
              <h3 className='font-medium text-sm'>Updates</h3>
              <p className='mt-1 text-sm text-muted-foreground'>Pro includes all future updates. No subscription, no recurring fees.</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className='mt-20 max-w-2xl'>
          <h2 className='text-lg font-medium'>Questions</h2>
          <dl className='mt-6 space-y-6 text-sm'>
            <div>
              <dt className='font-medium'>What does BYOK mean?</dt>
              <dd className='mt-1 text-muted-foreground'>Bring Your Own Key. You provide your own API key for OpenAI or Anthropic to use the AI features.</dd>
            </div>
            <div>
              <dt className='font-medium'>Is Pro really one-time?</dt>
              <dd className='mt-1 text-muted-foreground'>Yes. Pay once, use forever. All future updates are included.</dd>
            </div>
            <div>
              <dt className='font-medium'>Can I upgrade later?</dt>
              <dd className='mt-1 text-muted-foreground'>Yes. Start with Free and upgrade to Pro anytime from your dashboard.</dd>
            </div>
            <div>
              <dt className='font-medium'>What counts as a device?</dt>
              <dd className='mt-1 text-muted-foreground'>Each computer where you activate Pro. You can deactivate and move your license anytime.</dd>
            </div>
            <div>
              <dt className='font-medium'>Do you offer refunds?</dt>
              <dd className='mt-1 text-muted-foreground'>Yes. If you're not satisfied, email within 14 days for a full refund.</dd>
            </div>
          </dl>
        </div>
      </main>

      {/* Footer */}
      <footer className='border-t'>
        <div className='container mx-auto px-4 py-8'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
            <div className='flex items-center gap-2'>
              <img src='https://assets-cdn.querystudio.dev/QueryStudioIconNoBG.png' alt='QueryStudio' className='h-5 w-5' />
              <span className='text-sm text-muted-foreground'>QueryStudio</span>
            </div>
            <nav className='flex items-center gap-6'>
              <Link to='/download' className='text-sm text-muted-foreground hover:text-foreground'>
                Download
              </Link>
              <Link to='/pricing' className='text-sm text-muted-foreground hover:text-foreground'>
                Pricing
              </Link>
              <Link to='/login' className='text-sm text-muted-foreground hover:text-foreground'>
                Login
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
