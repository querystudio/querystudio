import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Check, ArrowLeft } from 'lucide-react'
import Spinner from '@/components/ui/spinner'
import { Header } from '@/components/header'

export const Route = createFileRoute('/waitlist')({
  component: WaitlistPage,
})

function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await authClient.waitlist.join({
        email,
      })

      if (error) {
        if (error.code === 'email_already_in_waitlist') {
          toast.error('You are already on the waitlist!')
        } else {
          toast.error(error.message || 'Failed to join waitlist')
        }
        return
      }

      setIsSuccess(true)
      toast.success('Successfully joined the waitlist!')
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className='min-h-screen bg-background'>
        <Header />
        <div className='container mx-auto px-4 py-16 max-w-sm'>
          <div className='flex items-center gap-2 mb-4'>
            <Check className='h-5 w-5' />
            <h1 className='text-xl font-semibold'>You're on the list</h1>
          </div>
          <p className='text-sm text-muted-foreground mb-6'>
            We'll notify you at <span className='text-foreground'>{email}</span> when we're ready.
          </p>
          <Button variant='outline' asChild>
            <Link to='/'>
              <ArrowLeft className='h-4 w-4 mr-2' />
              Back
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background'>
      <Header />
      <div className='container mx-auto px-4 py-16 max-w-sm'>
        <div className='mb-6'>
          <h1 className='text-xl font-semibold mb-1'>Join the waitlist</h1>
          <p className='text-sm text-muted-foreground'>Be the first to know when QueryStudio launches</p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input id='email' type='email' placeholder='you@example.com' value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
          </div>
          <Button type='submit' className='w-full' disabled={isLoading}>
            {isLoading && <Spinner size={16} />}
            Join waitlist
          </Button>
        </form>
      </div>
    </div>
  )
}
