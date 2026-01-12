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
        <aside className='w-64 border-r min-h-screen p-4'>
          <div className='flex items-center gap-2 mb-8 px-2'>
            <img src='https://assets-cdn.querystudio.dev/QueryStudioIconNoBG.png' alt='QueryStudio' className='h-8 w-8' />
            <span className='font-semibold text-lg'>QueryStudio</span>
          </div>

          <nav className='space-y-1'>
            {sidebarItems.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <item.icon className='h-4 w-4' />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className='flex-1 p-8'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
