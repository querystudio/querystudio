import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Header } from '@/components/header'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import Spinner from '@/components/ui/spinner'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      })

      if (error) {
        toast.error(error.message || 'Failed to sign in')
        return
      }

      toast.success('Signed in successfully')
      navigate({ to: '/' })
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-background'>
      <Header />
      <div className='container mx-auto px-4 py-16 max-w-sm'>
        <div className='mb-8'>
          <h1 className='text-xl font-semibold mb-1'>Sign in</h1>
          <p className='text-sm text-muted-foreground'>Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input id='email' type='email' placeholder='you@example.com' value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='password'>Password</Label>
            <Input id='password' type='password' placeholder='••••••••' value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
          </div>
          <Button type='submit' className='w-full' disabled={isLoading}>
            {isLoading && <Spinner size={16} />}
            Sign in
          </Button>
        </form>

        <p className='text-sm text-muted-foreground mt-6'>
          Don't have an account?{' '}
          <Link to='/signup' className='text-foreground underline'>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
