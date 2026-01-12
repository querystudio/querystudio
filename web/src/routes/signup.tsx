import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Header } from '@/components/header'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import Spinner from '@/components/ui/spinner'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
      })

      if (error) {
        toast.error(error.message || 'Failed to create account')
        return
      }

      toast.success('Account created! Please check your email to verify your account.')
      navigate({ to: '/login' })
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-background'>
      <Header />
      <div className='container mx-auto px-4 py-16'>
        <div className='max-w-sm mx-auto'>
          <h1 className='text-xl font-semibold mb-1'>Create an account</h1>
          <p className='text-muted-foreground text-sm mb-6'>Get started with QueryStudio</p>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Name</Label>
              <Input id='name' type='text' placeholder='John Doe' value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input id='email' type='email' placeholder='you@example.com' value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <Input id='password' type='password' placeholder='••••••••' value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} disabled={isLoading} />
              <p className='text-xs text-muted-foreground'>At least 8 characters</p>
            </div>
            <Button type='submit' className='w-full' disabled={isLoading}>
              {isLoading && <Spinner size={16} />}
              Create account
            </Button>
          </form>

          <p className='text-sm text-muted-foreground text-center mt-6'>
            Already have an account?{' '}
            <Link to='/login' className='text-foreground hover:underline'>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
