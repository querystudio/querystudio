import { createFileRoute, Link } from '@tanstack/react-router'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Download, Apple, Monitor, ExternalLink, Info } from 'lucide-react'
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
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function isSignatureFile(filename: string): boolean {
  return filename.endsWith('.sig') || filename.endsWith('.asc')
}

function getLinuxLabel(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.includes('.appimage')) return 'AppImage'
  if (lower.includes('.deb')) return '.deb (Debian/Ubuntu)'
  if (lower.includes('.rpm')) return '.rpm (Fedora/RHEL)'
  if (lower.includes('.tar.gz')) return '.tar.gz'
  return filename
}

function getWindowsLabel(asset: FormattedAsset): string {
  const lower = asset.name.toLowerCase()
  const arch = getArchName(asset.arch)
  if (lower.includes('.msi')) return arch ? `${arch} (.msi)` : '.msi'
  if (lower.includes('.exe')) return arch ? `${arch} (.exe)` : '.exe'
  return arch || asset.name
}

function getArchName(arch: FormattedAsset['arch']) {
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
        <div className='container mx-auto px-4 py-16'>
          <h1 className='text-2xl font-semibold mb-4'>Downloads</h1>
          <p className='text-muted-foreground mb-6'>No releases available yet.</p>
          <Button variant='outline' asChild>
            <Link to='/'>Go Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  const macosAssets = release.assets.filter((a) => a.platform === 'macos' && !isSignatureFile(a.name))
  const windowsAssets = release.assets.filter((a) => a.platform === 'windows' && !isSignatureFile(a.name))
  const linuxAssets = release.assets.filter((a) => a.platform === 'linux' && !isSignatureFile(a.name))

  return (
    <div className='min-h-screen bg-background'>
      <Header />

      <section className='container mx-auto px-4 py-16'>
        <div className='mb-8'>
          <h1 className='text-2xl font-semibold mb-2'>Download QueryStudio</h1>
          <p className='text-muted-foreground'>
            Version {release.version}
            {release.isPrerelease && <span className='ml-2 text-sm'>(pre-release)</span>}
          </p>
        </div>

        <div className='grid md:grid-cols-3 gap-6 max-w-3xl mb-12'>
          {/* macOS */}
          <div className='border rounded-lg p-5'>
            <div className='flex items-center gap-2 mb-4'>
              <Apple className='h-5 w-5' />
              <h2 className='font-medium'>macOS</h2>
            </div>
            <div className='space-y-2'>
              {macosAssets.length > 0 ? (
                macosAssets.map((asset) => (
                  <a key={asset.name} href={asset.downloadUrl} download className='flex items-center justify-between p-2 border rounded hover:bg-muted transition-colors'>
                    <span className='flex items-center gap-2 text-sm'>
                      <Download className='h-4 w-4' />
                      {getArchName(asset.arch) || asset.name}
                    </span>
                    <span className='text-xs text-muted-foreground'>{formatBytes(asset.size)}</span>
                  </a>
                ))
              ) : (
                <p className='text-sm text-muted-foreground'>Coming soon</p>
              )}
            </div>
          </div>

          {/* Windows */}
          <div className='border rounded-lg p-5'>
            <div className='flex items-center gap-2 mb-4'>
              <Monitor className='h-5 w-5' />
              <h2 className='font-medium'>Windows</h2>
            </div>
            <div className='space-y-2'>
              {windowsAssets.length > 0 ? (
                windowsAssets.map((asset) => (
                  <a key={asset.name} href={asset.downloadUrl} download className='flex items-center justify-between p-2 border rounded hover:bg-muted transition-colors'>
                    <span className='flex items-center gap-2 text-sm'>
                      <Download className='h-4 w-4' />
                      {getWindowsLabel(asset)}
                    </span>
                    <span className='text-xs text-muted-foreground'>{formatBytes(asset.size)}</span>
                  </a>
                ))
              ) : (
                <p className='text-sm text-muted-foreground'>Coming soon</p>
              )}
            </div>
          </div>

          {/* Linux */}
          <div className='border rounded-lg p-5'>
            <div className='flex items-center gap-2 mb-4'>
              <Monitor className='h-5 w-5' />
              <h2 className='font-medium'>Linux</h2>
            </div>
            <div className='space-y-2'>
              {linuxAssets.length > 0 ? (
                linuxAssets.map((asset) => (
                  <a key={asset.name} href={asset.downloadUrl} download className='flex items-center justify-between p-2 border rounded hover:bg-muted transition-colors'>
                    <span className='flex items-center gap-2 text-sm'>
                      <Download className='h-4 w-4' />
                      {getLinuxLabel(asset.name)}
                    </span>
                    <span className='text-xs text-muted-foreground'>{formatBytes(asset.size)}</span>
                  </a>
                ))
              ) : (
                <p className='text-sm text-muted-foreground'>Coming soon</p>
              )}
            </div>
          </div>
        </div>

        {/* Release Notes */}
        {release.body && (
          <div className='max-w-2xl'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='font-medium'>Release Notes</h2>
              <a href={release.htmlUrl} target='_blank' rel='noopener noreferrer' className='text-sm text-muted-foreground hover:text-foreground flex items-center gap-1'>
                <ExternalLink className='h-3 w-3' />
                GitHub
              </a>
            </div>
            <p className='text-sm text-muted-foreground mb-4'>
              Published{' '}
              {new Date(release.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <pre className='whitespace-pre-wrap text-sm text-muted-foreground border rounded-lg p-4'>{release.body}</pre>
          </div>
        )}

        <Alert className='max-w-3xl mt-12'>
          <Info className='h-4 w-4' />
          <AlertTitle>macOS App Not Signed</AlertTitle>
          <AlertDescription>
            <p className='mb-2'>
              To get QueryStudio signed for macOS, it costs $100 per year. As a student who created this app, it's a lot of money. So if you want to support the goal of $100 to get QueryStudio signed,
              you are more than welcome to do it.
            </p>
            <a href={donateUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-primary hover:underline font-medium'>
              Donate to support signing
              <ExternalLink className='h-3 w-3' />
            </a>
          </AlertDescription>
        </Alert>
      </section>
    </div>
  )
}
