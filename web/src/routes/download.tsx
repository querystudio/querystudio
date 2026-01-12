import { createFileRoute, Link } from '@tanstack/react-router'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, Apple, Monitor, ExternalLink } from 'lucide-react'
import { createServerFn } from '@tanstack/react-start'

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

function getPlatformIcon(platform: FormattedAsset['platform']) {
  switch (platform) {
    case 'macos':
      return <Apple className='h-5 w-5' />
    case 'windows':
      return <Monitor className='h-5 w-5' />
    case 'linux':
      return <Monitor className='h-5 w-5' />
    default:
      return <Download className='h-5 w-5' />
  }
}

function getPlatformName(platform: FormattedAsset['platform']) {
  switch (platform) {
    case 'macos':
      return 'macOS'
    case 'windows':
      return 'Windows'
    case 'linux':
      return 'Linux'
    default:
      return 'Unknown'
  }
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
        <div className='container mx-auto px-4 py-24'>
          <div className='text-center'>
            <h1 className='text-4xl font-bold mb-4'>Downloads</h1>
            <p className='text-muted-foreground text-lg mb-8'>No releases available yet. Check back soon!</p>
            <Button variant='outline' asChild>
              <Link to='/'>Go Home</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Filter out signature files for the main download cards
  const macosAssets = release.assets.filter((a) => a.platform === 'macos' && !isSignatureFile(a.name))
  const windowsAssets = release.assets.filter((a) => a.platform === 'windows' && !isSignatureFile(a.name))
  const linuxAssets = release.assets.filter((a) => a.platform === 'linux' && !isSignatureFile(a.name))

  return (
    <div className='min-h-screen bg-background'>
      <Header />

      <section className='container mx-auto px-4 py-24'>
        <div className='text-center mb-16'>
          <h1 className='text-4xl md:text-5xl font-bold mb-4'>Download QueryStudio</h1>
          <p className='text-muted-foreground text-lg max-w-2xl mx-auto mb-4'>Get the latest version of QueryStudio for your platform.</p>
          <div className='flex items-center justify-center gap-2'>
            <Badge variant='secondary' className='text-sm'>
              {release.version}
            </Badge>
            {release.isPrerelease && <Badge variant='outline'>Pre-release</Badge>}
          </div>
        </div>

        <div className='grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16 items-start'>
          {/* macOS */}
          <Card className='relative h-full'>
            <CardHeader className='text-center'>
              <div className='h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4'>
                <Apple className='h-8 w-8' />
              </div>
              <CardTitle>macOS</CardTitle>
              <CardDescription>For Mac computers</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {macosAssets.length > 0 ? (
                macosAssets.map((asset) => (
                  <Button key={asset.name} className='w-full justify-between' variant='outline' asChild>
                    <a href={asset.downloadUrl} download>
                      <span className='flex items-center gap-2'>
                        <Download className='h-4 w-4' />
                        {getArchName(asset.arch) || asset.name}
                      </span>
                      <span className='text-xs text-muted-foreground'>{formatBytes(asset.size)}</span>
                    </a>
                  </Button>
                ))
              ) : (
                <p className='text-sm text-muted-foreground text-center'>Coming soon</p>
              )}
            </CardContent>
          </Card>

          {/* Windows */}
          <Card className='relative h-full'>
            <CardHeader className='text-center'>
              <div className='h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4'>
                <Monitor className='h-8 w-8' />
              </div>
              <CardTitle>Windows</CardTitle>
              <CardDescription>For Windows PCs</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {windowsAssets.length > 0 ? (
                windowsAssets.map((asset) => (
                  <Button key={asset.name} className='w-full justify-between' variant='outline' asChild>
                    <a href={asset.downloadUrl} download>
                      <span className='flex items-center gap-2'>
                        <Download className='h-4 w-4' />
                        {getArchName(asset.arch) || asset.name}
                      </span>
                      <span className='text-xs text-muted-foreground'>{formatBytes(asset.size)}</span>
                    </a>
                  </Button>
                ))
              ) : (
                <p className='text-sm text-muted-foreground text-center'>Coming soon</p>
              )}
            </CardContent>
          </Card>

          {/* Linux */}
          <Card className='relative h-full'>
            <CardHeader className='text-center'>
              <div className='h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4'>
                <Monitor className='h-8 w-8' />
              </div>
              <CardTitle>Linux</CardTitle>
              <CardDescription>For Linux distros</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {linuxAssets.length > 0 ? (
                linuxAssets.map((asset) => (
                  <Button key={asset.name} className='w-full justify-between' variant='outline' asChild>
                    <a href={asset.downloadUrl} download>
                      <span className='flex items-center gap-2'>
                        <Download className='h-4 w-4' />
                        {getLinuxLabel(asset.name)}
                      </span>
                      <span className='text-xs text-muted-foreground'>{formatBytes(asset.size)}</span>
                    </a>
                  </Button>
                ))
              ) : (
                <p className='text-sm text-muted-foreground text-center'>Coming soon</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Release Notes */}
        {release.body && (
          <div className='max-w-3xl mx-auto'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center justify-between'>
                  <span>Release Notes</span>
                  <Button variant='ghost' size='sm' asChild>
                    <a href={release.htmlUrl} target='_blank' rel='noopener noreferrer'>
                      <ExternalLink className='h-4 w-4 mr-2' />
                      View on GitHub
                    </a>
                  </Button>
                </CardTitle>
                <CardDescription>
                  Published on{' '}
                  {new Date(release.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='prose prose-sm dark:prose-invert max-w-none'>
                  <pre className='whitespace-pre-wrap text-sm text-muted-foreground'>{release.body}</pre>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* All Downloads */}
        {release.assets.filter((a) => !isSignatureFile(a.name)).length > 0 && (
          <div className='max-w-3xl mx-auto mt-8'>
            <Card>
              <CardHeader>
                <CardTitle>All Downloads</CardTitle>
                <CardDescription>All available files for this release</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='divide-y'>
                  {release.assets
                    .filter((a) => !isSignatureFile(a.name))
                    .map((asset) => (
                      <div key={asset.name} className='flex items-center justify-between py-3'>
                        <div className='flex items-center gap-3'>
                          {getPlatformIcon(asset.platform)}
                          <div>
                            <p className='font-medium text-sm'>{asset.name}</p>
                            <p className='text-xs text-muted-foreground'>
                              {getPlatformName(asset.platform)} {getArchName(asset.arch) && `• ${getArchName(asset.arch)}`} • {formatBytes(asset.size)} • {asset.downloadCount.toLocaleString()}{' '}
                              downloads
                            </p>
                          </div>
                        </div>
                        <Button size='sm' variant='outline' asChild>
                          <a href={asset.downloadUrl} download>
                            <Download className='h-4 w-4' />
                          </a>
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </div>
  )
}
