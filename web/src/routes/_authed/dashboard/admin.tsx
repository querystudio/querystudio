import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Loader2, Check, X, RefreshCw, Users, Clock, CheckCircle, XCircle } from 'lucide-react'
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
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold'>Admin</h1>
          <p className='text-muted-foreground'>Manage waitlist entries</p>
        </div>
        <Card>
          <CardContent className='py-12'>
            <div className='text-center text-muted-foreground'>
              <p>You don't have permission to access this page.</p>
            </div>
          </CardContent>
        </Card>
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
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Admin</h1>
          <p className='text-muted-foreground'>Manage waitlist entries</p>
        </div>
        <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-4'>
              <div className='p-2 bg-primary/10 rounded-lg'>
                <Users className='h-5 w-5 text-primary' />
              </div>
              <div>
                <p className='text-2xl font-bold'>{entries.length}</p>
                <p className='text-sm text-muted-foreground'>Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-4'>
              <div className='p-2 bg-yellow-500/10 rounded-lg'>
                <Clock className='h-5 w-5 text-yellow-500' />
              </div>
              <div>
                <p className='text-2xl font-bold'>{pendingEntries.length}</p>
                <p className='text-sm text-muted-foreground'>Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-4'>
              <div className='p-2 bg-green-500/10 rounded-lg'>
                <CheckCircle className='h-5 w-5 text-green-500' />
              </div>
              <div>
                <p className='text-2xl font-bold'>{acceptedEntries.length}</p>
                <p className='text-sm text-muted-foreground'>Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-4'>
              <div className='p-2 bg-red-500/10 rounded-lg'>
                <XCircle className='h-5 w-5 text-red-500' />
              </div>
              <div>
                <p className='text-2xl font-bold'>{rejectedEntries.length}</p>
                <p className='text-sm text-muted-foreground'>Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>Review and approve or reject waitlist requests</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : pendingEntries.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <p>No pending requests</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {pendingEntries.map((entry) => (
                <div key={entry.id} className='flex items-center justify-between p-4 border rounded-lg'>
                  <div>
                    <p className='font-medium'>{entry.email}</p>
                    <p className='text-sm text-muted-foreground'>Requested {formatDate(entry.requestedAt)}</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button size='sm' variant='outline' onClick={() => rejectMutation.mutate(entry.id)} disabled={processingId === entry.id}>
                      {processingId === entry.id && rejectMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <X className='h-4 w-4' />}
                      Reject
                    </Button>
                    <Button size='sm' onClick={() => approveMutation.mutate(entry.id)} disabled={processingId === entry.id}>
                      {processingId === entry.id && approveMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Check className='h-4 w-4' />}
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Entries */}
      <Card>
        <CardHeader>
          <CardTitle>All Entries</CardTitle>
          <CardDescription>Complete list of waitlist entries</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : entries.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <p>No waitlist entries yet</p>
            </div>
          ) : (
            <div className='space-y-2'>
              {entries.map((entry) => (
                <div key={entry.id} className='flex items-center justify-between p-3 border rounded-lg'>
                  <div className='flex items-center gap-3'>
                    <Badge variant={entry.status === 'accepted' ? 'default' : entry.status === 'rejected' ? 'destructive' : 'secondary'}>{entry.status}</Badge>
                    <span className='font-medium'>{entry.email}</span>
                  </div>
                  <span className='text-sm text-muted-foreground'>{formatDate(entry.requestedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
