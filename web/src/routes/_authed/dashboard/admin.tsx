import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Check, X, RefreshCw } from 'lucide-react'
import Spinner from '@/components/ui/spinner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/_authed/dashboard/admin')({
  component: AdminPage,
})

type WaitlistEntry = {
  id: string
  email: string
  status: 'pending' | 'accepted' | 'rejected'
  requestedAt: Date | string
  processedAt?: Date | string
}

function AdminPage() {
  const { user } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const isAdmin = user.email === 'vestergaardlasse2@gmail.com'

  const {
    data: entries = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['waitlist-entries'],
    queryFn: async () => {
      const response = await authClient.waitlist.list({
        query: {
          limit: 100,
        },
      })
      if (response.error) throw response.error
      return (response.data?.data ?? []) as WaitlistEntry[]
    },
    enabled: isAdmin,
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      setProcessingId(id)
      const response = await authClient.waitlist.request.approve({ id })
      if (response.error) throw response.error
    },
    onSuccess: () => {
      toast.success('Entry approved successfully')
      queryClient.invalidateQueries({ queryKey: ['waitlist-entries'] })
    },
    onError: () => {
      toast.error('Failed to approve entry')
    },
    onSettled: () => {
      setProcessingId(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      setProcessingId(id)
      const response = await authClient.waitlist.request.reject({ id })
      if (response.error) throw response.error
    },
    onSuccess: () => {
      toast.success('Entry rejected')
      queryClient.invalidateQueries({ queryKey: ['waitlist-entries'] })
    },
    onError: () => {
      toast.error('Failed to reject entry')
    },
    onSettled: () => {
      setProcessingId(null)
    },
  })

  if (!isAdmin) {
    return (
      <div className='max-w-lg'>
        <h1 className='text-xl font-semibold mb-1'>Admin</h1>
        <p className='text-sm text-muted-foreground mb-6'>Manage waitlist entries</p>
        <div className='border rounded-lg p-8 text-center'>
          <p className='text-sm text-muted-foreground'>You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  const pendingEntries = entries.filter((e) => e.status === 'pending')
  const acceptedEntries = entries.filter((e) => e.status === 'accepted')
  const rejectedEntries = entries.filter((e) => e.status === 'rejected')

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className='max-w-2xl'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-xl font-semibold mb-1'>Admin</h1>
          <p className='text-sm text-muted-foreground'>Manage waitlist entries</p>
        </div>
        <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-4 gap-4 mb-6'>
        <div className='border rounded-lg p-4'>
          <p className='text-2xl font-semibold'>{entries.length}</p>
          <p className='text-sm text-muted-foreground'>Total</p>
        </div>
        <div className='border rounded-lg p-4'>
          <p className='text-2xl font-semibold'>{pendingEntries.length}</p>
          <p className='text-sm text-muted-foreground'>Pending</p>
        </div>
        <div className='border rounded-lg p-4'>
          <p className='text-2xl font-semibold'>{acceptedEntries.length}</p>
          <p className='text-sm text-muted-foreground'>Accepted</p>
        </div>
        <div className='border rounded-lg p-4'>
          <p className='text-2xl font-semibold'>{rejectedEntries.length}</p>
          <p className='text-sm text-muted-foreground'>Rejected</p>
        </div>
      </div>

      {/* Pending Entries */}
      <div className='border rounded-lg p-5 mb-6'>
        <h2 className='font-medium mb-1'>Pending requests</h2>
        <p className='text-sm text-muted-foreground mb-4'>Review and approve or reject waitlist requests</p>

        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <Spinner size={24} color='currentColor' className='text-muted-foreground' />
          </div>
        ) : pendingEntries.length === 0 ? (
          <p className='text-sm text-muted-foreground py-4'>No pending requests</p>
        ) : (
          <div className='space-y-2'>
            {pendingEntries.map((entry) => (
              <div key={entry.id} className='flex items-center justify-between p-3 border rounded'>
                <div>
                  <p className='text-sm font-medium'>{entry.email}</p>
                  <p className='text-xs text-muted-foreground'>Requested {formatDate(entry.requestedAt)}</p>
                </div>
                <div className='flex items-center gap-2'>
                  <Button size='sm' variant='outline' onClick={() => rejectMutation.mutate(entry.id)} disabled={processingId === entry.id}>
                    {processingId === entry.id && rejectMutation.isPending ? <Spinner size={14} color='currentColor' /> : <X className='h-4 w-4' />}
                  </Button>
                  <Button size='sm' onClick={() => approveMutation.mutate(entry.id)} disabled={processingId === entry.id}>
                    {processingId === entry.id && approveMutation.isPending ? <Spinner size={14} color='currentColor' /> : <Check className='h-4 w-4' />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Entries */}
      <div className='border rounded-lg p-5'>
        <h2 className='font-medium mb-1'>All entries</h2>
        <p className='text-sm text-muted-foreground mb-4'>Complete list of waitlist entries</p>

        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <Spinner size={24} color='currentColor' className='text-muted-foreground' />
          </div>
        ) : entries.length === 0 ? (
          <p className='text-sm text-muted-foreground py-4'>No waitlist entries yet</p>
        ) : (
          <div className='space-y-1'>
            {entries.map((entry) => (
              <div key={entry.id} className='flex items-center justify-between p-2 rounded hover:bg-muted'>
                <div className='flex items-center gap-3'>
                  <span className='text-xs bg-muted px-2 py-0.5 rounded'>{entry.status}</span>
                  <span className='text-sm'>{entry.email}</span>
                </div>
                <span className='text-xs text-muted-foreground'>{formatDate(entry.requestedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
