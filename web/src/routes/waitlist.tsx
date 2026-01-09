import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import Spinner from '@/components/ui/spinner'

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
      <div className='min-h-screen flex items-center justify-center bg-background px-4'>
        <div className='w-full max-w-md'>
          <Card>
            <CardContent className='pt-6'>
              <div className='flex flex-col items-center text-center gap-4'>
                <div className='h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center'>
                  <CheckCircle className='h-8 w-8 text-green-600 dark:text-green-400' />
                </div>
                <h2 className='text-2xl font-bold'>You're on the list!</h2>
                <p className='text-muted-foreground'>
                  Thanks for joining the QueryStudio waitlist. We'll notify you at <span className='font-medium text-foreground'>{email}</span> when we're ready to launch.
                </p>
                <Button asChild variant='outline' className='mt-4'>
                  <Link to='/'>
                    <ArrowLeft className='h-4 w-4 mr-2' />
                    Back to home
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-background px-4'>
      <div className='w-full max-w-md'>
        <div className='flex flex-col items-center mb-8'>
          <img src='https://assets-cdn.querystudio.dev/QueryStudioIconNoBG.png' alt='QueryStudio' className='h-16 w-16 mb-4' />
          <h1 className='text-2xl font-bold'>Join the Waitlist</h1>
          <p className='text-muted-foreground text-center'>Be the first to know when QueryStudio launches</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input id='email' type='email' placeholder='you@example.com' value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
              </div>
            </CardContent>
            <CardFooter className='pt-2'>
              <Button type='submit' className='w-full' disabled={isLoading}>
                {isLoading && <Spinner size={16} />}
                Join Waitlist
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
