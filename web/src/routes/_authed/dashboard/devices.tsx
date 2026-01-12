import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
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
import { Monitor, Smartphone, Laptop, Trash2, Power, PowerOff } from 'lucide-react'
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
      <div className='max-w-lg'>
        <h1 className='text-xl font-semibold mb-1'>Devices</h1>
        <p className='text-sm text-muted-foreground mb-6'>Manage your activated devices</p>

        <div className='border rounded-lg p-6 text-center'>
          <p className='text-sm text-muted-foreground mb-4'>Upgrade to Pro to manage devices across multiple machines.</p>
          <Button size='sm' asChild>
            <Link to='/dashboard/billing'>Upgrade to Pro</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='max-w-lg'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-xl font-semibold mb-1'>Devices</h1>
          <p className='text-sm text-muted-foreground'>
            {data.activeCount} of {data.maxDevices} active
          </p>
        </div>
        {!data.licenseValid && <span className='text-xs text-destructive'>{data.licenseError || 'License invalid'}</span>}
      </div>

      <div className='border rounded-lg'>
        {isLoading ? (
          <div className='flex justify-center py-8'>
            <Spinner />
          </div>
        ) : data.devices.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground'>
            <Monitor className='h-8 w-8 mx-auto mb-2 opacity-50' />
            <p className='text-sm'>No devices yet</p>
          </div>
        ) : (
          <div className='divide-y'>
            {data.devices.map((device: Device) => {
              const DeviceIcon = getDeviceIcon(device.osType)
              const isPending = deactivateMutation.isPending || reactivateMutation.isPending || deleteMutation.isPending

              return (
                <div key={device.id} className='flex items-center justify-between p-4'>
                  <div className='flex items-center gap-3'>
                    <DeviceIcon className={`h-4 w-4 ${device.active ? '' : 'text-muted-foreground'}`} />
                    <div>
                      <div className='flex items-center gap-2'>
                        <span className={`text-sm ${!device.active ? 'text-muted-foreground' : ''}`}>{device.name}</span>
                        {device.active && <span className='text-xs bg-muted px-1.5 py-0.5 rounded'>Active</span>}
                      </div>
                      <p className='text-xs text-muted-foreground'>{device.lastSeenAt ? formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true }) : 'Never used'}</p>
                    </div>
                  </div>

                  <div className='flex items-center gap-1'>
                    {device.active ? (
                      <Button variant='ghost' size='icon' className='h-8 w-8' onClick={() => deactivateMutation.mutate(device.id)} disabled={isPending} title='Deactivate'>
                        <PowerOff className='h-4 w-4' />
                      </Button>
                    ) : (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8'
                        onClick={() => reactivateMutation.mutate(device.id)}
                        disabled={isPending || data.activeCount >= data.maxDevices}
                        title='Reactivate'
                      >
                        <Power className='h-4 w-4' />
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant='ghost' size='icon' className='h-8 w-8 text-destructive hover:text-destructive' title='Delete'>
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
      </div>
    </div>
  )
}
