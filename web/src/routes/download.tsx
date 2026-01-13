import { createFileRoute, Link } from '@tanstack/react-router'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Download, ExternalLink } from 'lucide-react'
import { createServerFn } from '@tanstack/react-start'

const donateUrl = 'https://buy.polar.sh/polar_cl_GjR7lflPCEnKKPTB2QE5eNOfWOLqlRNYJAvsF2Tf9t6'

interface FormattedAsset {
  name: string
  downloadUrl: string
  size: number
  downloadCount: number
  contentType: string
  platform: 'macos' | 'windows' | 'linux' | 'unknown'
  arch: 'x64' | 'arm64' | 'universal' | 'unknown'
}

interface FormattedRelease {
  id: number
  version: string
  name: string
  body: string
  isPrerelease: boolean
  createdAt: string
  publishedAt: string
  assets: FormattedAsset[]
  htmlUrl: string
}

const getLatestRelease = createServerFn({ method: 'GET' }).handler(async () => {
  const GITHUB_REPO = 'lassejlv/querystudio-releases'
  const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'QueryStudio-Web',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch latest release')
    }

    const release = await response.json()

    const detectPlatform = (filename: string): FormattedAsset['platform'] => {
      const lower = filename.toLowerCase()
      if (lower.includes('.dmg') || lower.includes('macos') || lower.includes('darwin')) {
        return 'macos'
      }
      if (lower.includes('.exe') || lower.includes('.msi') || lower.includes('windows') || lower.includes('win32') || lower.includes('win64')) {
        return 'windows'
      }
      if (lower.includes('.deb') || lower.includes('.rpm') || lower.includes('.appimage') || lower.includes('linux')) {
        return 'linux'
      }
      return 'unknown'
    }

    const detectArch = (filename: string): FormattedAsset['arch'] => {
      const lower = filename.toLowerCase()
      if (lower.includes('universal')) {
        return 'universal'
      }
      if (lower.includes('arm64') || lower.includes('aarch64')) {
        return 'arm64'
      }
      if (lower.includes('x64') || lower.includes('x86_64') || lower.includes('amd64')) {
        return 'x64'
      }
      return 'unknown'
    }

    return {
      id: release.id,
      version: release.tag_name,
      name: release.name || release.tag_name,
      body: release.body || '',
      isPrerelease: release.prerelease,
      createdAt: release.created_at,
      publishedAt: release.published_at,
      htmlUrl: release.html_url,
      assets: release.assets.map((asset: { name: string; browser_download_url: string; size: number; download_count: number; content_type: string }) => ({
        name: asset.name,
        downloadUrl: asset.browser_download_url,
        size: asset.size,
        downloadCount: asset.download_count,
        contentType: asset.content_type,
        platform: detectPlatform(asset.name),
        arch: detectArch(asset.name),
      })),
    } as FormattedRelease
  } catch (error) {
    console.error('Error fetching latest release:', error)
    return null
  }
})

export const Route = createFileRoute('/download')({
  component: DownloadPage,
  loader: () => getLatestRelease(),
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function isSignatureFile(filename: string): boolean {
  return filename.endsWith('.sig') || filename.endsWith('.asc')
}

function getArchLabel(arch: FormattedAsset['arch']) {
  switch (arch) {
    case 'arm64':
      return 'Apple Silicon'
    case 'x64':
      return 'Intel'
    case 'universal':
      return 'Universal'
    default:
      return ''
  }
}

function DownloadPage() {
  const release = Route.useLoaderData()

  if (!release) {
    return (
      <div className='min-h-screen bg-background'>
        <Header />
        <main className='container mx-auto px-4 py-16 md:py-24'>
          <h1 className='text-3xl font-semibold tracking-tight'>Download</h1>
          <p className='mt-2 text-muted-foreground'>No releases available yet.</p>
          <div className='mt-8'>
            <Button variant='outline' asChild>
              <Link to='/'>Back to home</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const macosAssets = release.assets.filter((a) => a.platform === 'macos' && !isSignatureFile(a.name))
  const windowsAssets = release.assets.filter((a) => a.platform === 'windows' && !isSignatureFile(a.name))
  const linuxAssets = release.assets.filter((a) => a.platform === 'linux' && !isSignatureFile(a.name))

  return (
    <div className='min-h-screen bg-background'>
      <Header />

      <main className='container mx-auto px-4 py-16 md:py-24'>
        <div className='max-w-2xl'>
          <h1 className='text-3xl font-semibold tracking-tight'>Download QueryStudio</h1>
          <p className='mt-2 text-muted-foreground'>
            Version {release.version}
            {release.isPrerelease && ' (pre-release)'}
          </p>
        </div>

        {/* Download cards */}
        <div className='mt-12 grid gap-6 md:grid-cols-3 max-w-4xl'>
          {/* macOS */}
          <div className='border rounded-lg p-6'>
            <h2 className='text-lg font-medium'>macOS</h2>
            <p className='mt-1 text-sm text-muted-foreground'>.dmg installer</p>

            {macosAssets.length > 0 ? (
              <div className='mt-6 space-y-3'>
                {macosAssets.map((asset) => (
                  <Button key={asset.name} asChild className='w-full justify-start'>
                    <a href={asset.downloadUrl} download>
                      <Download className='h-4 w-4 mr-2' />
                      {getArchLabel(asset.arch)}
                      <span className='ml-auto text-xs opacity-70'>{formatBytes(asset.size)}</span>
                    </a>
                  </Button>
                ))}
              </div>
            ) : (
              <p className='mt-6 text-sm text-muted-foreground'>Coming soon</p>
            )}
          </div>

          {/* Windows */}
          <div className='border rounded-lg p-6'>
            <h2 className='text-lg font-medium'>Windows</h2>
            <p className='mt-1 text-sm text-muted-foreground'>.msi or .exe installer</p>

            {windowsAssets.length > 0 ? (
              <div className='mt-6 space-y-3'>
                {windowsAssets.map((asset) => {
                  const label = asset.name.toLowerCase().includes('.msi') ? 'Installer (.msi)' : 'Installer (.exe)'
                  return (
                    <Button key={asset.name} asChild className='w-full justify-start'>
                      <a href={asset.downloadUrl} download>
                        <Download className='h-4 w-4 mr-2' />
                        {label}
                        <span className='ml-auto text-xs opacity-70'>{formatBytes(asset.size)}</span>
                      </a>
                    </Button>
                  )
                })}
              </div>
            ) : (
              <p className='mt-6 text-sm text-muted-foreground'>Coming soon</p>
            )}
          </div>

          {/* Linux */}
          <div className='border rounded-lg p-6'>
            <h2 className='text-lg font-medium'>Linux</h2>
            <p className='mt-1 text-sm text-muted-foreground'>AppImage, .deb, or .rpm</p>

            {linuxAssets.length > 0 ? (
              <div className='mt-6 space-y-3'>
                {linuxAssets.map((asset) => {
                  const lower = asset.name.toLowerCase()
                  let label = 'Download'
                  if (lower.includes('.appimage')) label = 'AppImage'
                  else if (lower.includes('.deb')) label = '.deb (Debian/Ubuntu)'
                  else if (lower.includes('.rpm')) label = '.rpm (Fedora/RHEL)'

                  return (
                    <Button key={asset.name} variant='outline' asChild className='w-full justify-start'>
                      <a href={asset.downloadUrl} download>
                        <Download className='h-4 w-4 mr-2' />
                        {label}
                        <span className='ml-auto text-xs opacity-70'>{formatBytes(asset.size)}</span>
                      </a>
                    </Button>
                  )
                })}
              </div>
            ) : (
              <p className='mt-6 text-sm text-muted-foreground'>Coming soon</p>
            )}
          </div>
        </div>

        {/* Release notes link */}
        <div className='mt-8 max-w-4xl'>
          <a href={release.htmlUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground'>
            View release notes on GitHub
            <ExternalLink className='h-3 w-3' />
          </a>
        </div>

        {/* macOS signing note */}
        <div className='mt-16 max-w-xl'>
          <h2 className='text-lg font-medium'>macOS not signed</h2>
          <p className='mt-2 text-sm text-muted-foreground leading-relaxed'>
            The macOS app isn't signed with an Apple Developer certificate yet. On first launch, right-click the app and select "Open" to bypass Gatekeeper.
          </p>
          <p className='mt-3 text-sm text-muted-foreground leading-relaxed'>Signing requires a $99/year developer account. As a student, I'd appreciate any support towards this goal.</p>
          <div className='mt-4'>
            <a href={donateUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground'>
              Support signing
              <ExternalLink className='h-3 w-3' />
            </a>
          </div>
        </div>

        {/* Installation */}
        <div className='mt-16 max-w-xl'>
          <h2 className='text-lg font-medium'>Installation</h2>
          <dl className='mt-4 space-y-4 text-sm'>
            <div>
              <dt className='font-medium'>macOS</dt>
              <dd className='mt-1 text-muted-foreground'>Open the .dmg and drag QueryStudio to Applications.</dd>
            </div>
            <div>
              <dt className='font-medium'>Windows</dt>
              <dd className='mt-1 text-muted-foreground'>Run the installer. You may need to allow the app through Windows Defender.</dd>
            </div>
            <div>
              <dt className='font-medium'>Linux</dt>
              <dd className='mt-1 text-muted-foreground'>Install the .deb or .rpm with your package manager, or make the AppImage executable and run it.</dd>
            </div>
          </dl>
        </div>
      </main>

      {/* Footer */}
      <footer className='border-t'>
        <div className='container mx-auto px-4 py-8'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
            <div className='flex items-center gap-2'>
              <img src='https://assets-cdn.querystudio.dev/QueryStudioIconNoBG.png' alt='QueryStudio' className='h-5 w-5' />
              <span className='text-sm text-muted-foreground'>QueryStudio</span>
            </div>
            <nav className='flex items-center gap-6'>
              <Link to='/download' className='text-sm text-muted-foreground hover:text-foreground'>
                Download
              </Link>
              <Link to='/pricing' className='text-sm text-muted-foreground hover:text-foreground'>
                Pricing
              </Link>
              <Link to='/login' className='text-sm text-muted-foreground hover:text-foreground'>
                Login
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
