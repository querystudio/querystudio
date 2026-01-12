import { Link, useLocation } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, LogOut, Settings } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { useQuery } from '@tanstack/react-query'

export function Header() {
  const location = useLocation()
  const currentPath = location.pathname

  const { data: session, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const result = await authClient.getSession()
      return result.data
    },
  })

  const user = session?.user

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.href = '/'
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className='border-b'>
      <div className='container mx-auto px-4 py-4 flex items-center justify-between'>
        <Link to='/' className='flex items-center gap-3 hover:opacity-80 transition-opacity'>
          <img src='https://assets-cdn.querystudio.dev/QueryStudioIconNoBG.png' alt='QueryStudio' className='h-8 w-8' />
          <span className='font-semibold text-lg'>QueryStudio</span>
        </Link>

        <nav className='flex items-center gap-6'>
          <Link to='/' className={`text-sm transition-colors ${currentPath === '/' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
            Home
          </Link>
          <Link to='/download' className={`text-sm transition-colors ${currentPath === '/download' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
            Download
          </Link>
          <a href='/#pricing' className='text-sm transition-colors text-muted-foreground hover:text-foreground'>
            Pricing
          </a>

          {isLoading ? (
            <div className='w-8 h-8 rounded-full bg-muted animate-pulse' />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
                  <Avatar className='h-8 w-8'>
                    <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='w-56' align='end' forceMount>
                <div className='flex items-center justify-start gap-2 p-2'>
                  <div className='flex flex-col space-y-1 leading-none'>
                    {user.name && <p className='font-medium'>{user.name}</p>}
                    {user.email && <p className='w-50 truncate text-sm text-muted-foreground'>{user.email}</p>}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to='/dashboard' className='cursor-pointer'>
                    <User className='mr-2 h-4 w-4' />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to='/dashboard/account' className='cursor-pointer'>
                    <Settings className='mr-2 h-4 w-4' />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className='cursor-pointer text-red-600 focus:text-red-600'>
                  <LogOut className='mr-2 h-4 w-4' />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className='flex items-center gap-2'>
              <Button variant='ghost' size='sm' asChild>
                <Link to='/login'>Login</Link>
              </Button>
              <Button size='sm' asChild>
                <Link to='/signup'>Sign up</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
