import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { User, Shield, CreditCard, Users, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardLayout,
})

const sidebarItems = [
  {
    label: 'Account',
    href: '/dashboard/account',
    icon: User,
  },
  {
    label: 'Security',
    href: '/dashboard/security',
    icon: Shield,
  },
  {
    label: 'Billing',
    href: '/dashboard/billing',
    icon: CreditCard,
  },
  {
    label: 'Devices',
    href: '/dashboard/devices',
    icon: Monitor,
  },
  {
    label: 'Admin',
    href: '/dashboard/admin',
    icon: Users,
  },
]

function DashboardLayout() {
  const location = useLocation()

  return (
    <div className='min-h-screen bg-background'>
      <div className='flex'>
        {/* Sidebar */}
        <aside className='w-56 border-r min-h-screen p-4'>
          <Link to='/' className='flex items-center gap-2 mb-6 px-2'>
            <img src='https://assets-cdn.querystudio.dev/QueryStudioIconNoBG.png' alt='QueryStudio' className='h-6 w-6' />
            <span className='font-medium'>QueryStudio</span>
          </Link>

          <nav className='space-y-1'>
            {sidebarItems.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn('flex items-center gap-2 px-2 py-1.5 rounded text-sm', isActive ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground')}
                >
                  <item.icon className='h-4 w-4' />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className='flex-1 p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
