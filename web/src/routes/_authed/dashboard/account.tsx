import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { auth } from '@/lib/auth'
import { realtime } from '@/lib/realtime'
import { db } from 'drizzle'
import { user as userTable } from 'drizzle/schema/auth'
import { eq } from 'drizzle-orm'
import { useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'

const updateNameFn = createServerFn()
  .inputValidator(z.object({ name: z.string() }))
  .handler(async ({ data }) => {
    const req = getRequest()
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session) throw new Error('Unauthorized')

    const { user } = session

    await db.update(userTable).set({ name: data.name }).where(eq(userTable.id, user.id))

    const channel = realtime.channel(`backend-user-${user.id}`)
    channel.emit('userBackend.changesSaved', { message: 'Your name has been updated!' })

    return { success: true }
  })

export const Route = createFileRoute('/_authed/dashboard/account')({
  component: AccountPage,
})

function AccountPage() {
  const { user } = Route.useRouteContext()
  const [name, setName] = useState(user.name)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateNameFn({ data: { name } })
    } catch (error) {
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='max-w-lg'>
      <h1 className='text-xl font-semibold mb-1'>Account</h1>
      <p className='text-sm text-muted-foreground mb-6'>Manage your account settings</p>

      <div className='space-y-6'>
        <div className='border rounded-lg p-5 space-y-4'>
          <h2 className='font-medium'>Profile</h2>
          <div className='space-y-2'>
            <Label htmlFor='name'>Name</Label>
            <Input id='name' value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input id='email' type='email' defaultValue={user.email} disabled />
            <p className='text-xs text-muted-foreground'>Contact support to change your email</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>

        <div className='border border-destructive/20 rounded-lg p-5'>
          <h2 className='font-medium text-destructive mb-2'>Danger zone</h2>
          <p className='text-sm text-muted-foreground mb-4'>Permanently delete your account and all data</p>
          <Button variant='destructive' size='sm'>
            Delete account
          </Button>
        </div>
      </div>
    </div>
  )
}
