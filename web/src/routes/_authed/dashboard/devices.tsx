import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Monitor, Smartphone, Laptop, Trash2, Power, PowerOff, Crown } from 'lucide-react'
import { getDevicesFn, deactivateDeviceFn, reactivateDeviceFn, deleteDeviceFn } from '@/server/devices'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import Spinner from '@/components/ui/spinner'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/_authed/dashboard/devices')({
  component: DevicesPage,
  loader: async () => {
    const devices = await getDevicesFn()
    return { devices }
  },
})

type DeviceData = Awaited<ReturnType<typeof getDevicesFn>>
type Device = DeviceData['devices'][number]

function DevicesPage() {
  const { user } = Route.useRouteContext() as { user: { isPro?: boolean } }
  const initialData = Route.useLoaderData() as { devices: DeviceData }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: () => getDevicesFn(),
    initialData: initialData.devices,
  })

  const deactivateMutation = useMutation({
    mutationFn: (deviceId: string) => deactivateDeviceFn({ data: { deviceId } }),
    onSuccess: () => {
      toast.success('Device deactivated')
      refetch()
    },
    onError: (err) => toast.error('Failed to deactivate', { description: err.message }),
  })

  const reactivateMutation = useMutation({
    mutationFn: (deviceId: string) => reactivateDeviceFn({ data: { deviceId } }),
    onSuccess: () => {
      toast.success('Device reactivated')
      refetch()
    },
    onError: (err) => toast.error('Failed to reactivate', { description: err.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (deviceId: string) => deleteDeviceFn({ data: { deviceId } }),
    onSuccess: () => {
      toast.success('Device deleted')
      refetch()
    },
    onError: (err) => toast.error('Failed to delete', { description: err.message }),
  })

  const getDeviceIcon = (osType: string | null) => {
    switch (osType) {
      case 'ios':
      case 'android':
        return Smartphone
      case 'macos':
        return Laptop
      default:
        return Monitor
    }
  }

  if (!user.isPro) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold'>Devices</h1>
          <p className='text-muted-foreground'>Manage your activated devices</p>
        </div>
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12 text-center'>
            <Crown className='h-10 w-10 text-muted-foreground mb-3' />
            <h3 className='font-semibold mb-1'>Pro Required</h3>
            <p className='text-sm text-muted-foreground mb-4'>Upgrade to manage devices across multiple machines.</p>
            <Button asChild>
              <Link to='/dashboard/billing'>Upgrade to Pro</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Devices</h1>
          <p className='text-muted-foreground'>
            {data.activeCount} of {data.maxDevices} devices active
          </p>
        </div>
        {!data.licenseValid && <Badge variant='destructive'>{data.licenseError || 'License Invalid'}</Badge>}
      </div>

      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>Your Devices</CardTitle>
          <CardDescription>Devices activated with your license key</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='flex justify-center py-8'>
              <Spinner />
            </div>
          ) : data.devices.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <Monitor className='h-10 w-10 mx-auto mb-3 opacity-50' />
              <p className='text-sm'>No devices yet. Open QueryStudio and activate with your license key.</p>
            </div>
          ) : (
            <div className='divide-y'>
              {data.devices.map((device: Device) => {
                const DeviceIcon = getDeviceIcon(device.osType)
                const isPending = deactivateMutation.isPending || reactivateMutation.isPending || deleteMutation.isPending

                return (
                  <div key={device.id} className='flex items-center justify-between py-3 first:pt-0 last:pb-0'>
                    <div className='flex items-center gap-3'>
                      <DeviceIcon className={`h-5 w-5 ${device.active ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <div className='flex items-center gap-2'>
                          <span className={`font-medium ${!device.active ? 'text-muted-foreground' : ''}`}>{device.name}</span>
                          {device.active && (
                            <Badge variant='secondary' className='text-xs'>
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className='text-xs text-muted-foreground'>{device.lastSeenAt ? formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true }) : 'Never used'}</p>
                      </div>
                    </div>

                    <div className='flex items-center gap-1'>
                      {device.active ? (
                        <Button variant='ghost' size='icon' onClick={() => deactivateMutation.mutate(device.id)} disabled={isPending} title='Deactivate'>
                          <PowerOff className='h-4 w-4' />
                        </Button>
                      ) : (
                        <Button variant='ghost' size='icon' onClick={() => reactivateMutation.mutate(device.id)} disabled={isPending || data.activeCount >= data.maxDevices} title='Reactivate'>
                          <Power className='h-4 w-4' />
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant='ghost' size='icon' className='text-destructive hover:text-destructive' title='Delete'>
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {device.name}?</AlertDialogTitle>
                            <AlertDialogDescription>This device will need to be reactivated to use QueryStudio again.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(device.id)} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
