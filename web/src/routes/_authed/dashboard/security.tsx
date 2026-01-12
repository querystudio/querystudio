import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Spinner from '@/components/ui/spinner'

export const Route = createFileRoute('/_authed/dashboard/security')({
  component: SecurityPage,
})

function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      // TODO: Implement password change with authClient
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='max-w-lg'>
      <h1 className='text-xl font-semibold mb-1'>Security</h1>
      <p className='text-sm text-muted-foreground mb-6'>Manage your security settings</p>

      <div className='space-y-6'>
        <div className='border rounded-lg p-5'>
          <h2 className='font-medium mb-4'>Change password</h2>
          <form onSubmit={handleChangePassword} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='current-password'>Current password</Label>
              <Input id='current-password' type='password' placeholder='••••••••' value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={isLoading} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='new-password'>New password</Label>
              <Input id='new-password' type='password' placeholder='••••••••' value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} disabled={isLoading} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='confirm-password'>Confirm new password</Label>
              <Input
                id='confirm-password'
                type='password'
                placeholder='••••••••'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>
            <Button type='submit' disabled={isLoading}>
              {isLoading && <Spinner size={16} />}
              Update password
            </Button>
          </form>
        </div>

        <div className='border rounded-lg p-5'>
          <h2 className='font-medium mb-4'>Sessions</h2>
          <div className='flex items-center justify-between p-3 border rounded mb-4'>
            <div>
              <p className='text-sm font-medium'>Current session</p>
              <p className='text-xs text-muted-foreground'>This device</p>
            </div>
            <span className='text-xs bg-muted px-2 py-1 rounded'>Active</span>
          </div>
          <Button variant='outline' size='sm'>
            Sign out other sessions
          </Button>
        </div>
      </div>
    </div>
  )
}
