import { createFileRoute, Link } from '@tanstack/react-router'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
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
  if (lower.includes('.deb')) return '.deb'
  if (lower.includes('.rpm')) return '.rpm'
  if (lower.includes('.tar.gz')) return '.tar.gz'
  return filename
}

function getWindowsLabel(asset: FormattedAsset): string {
  const lower = asset.name.toLowerCase()
  if (lower.includes('.msi')) return '.msi'
  if (lower.includes('.exe')) return '.exe'
  return asset.name
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
          <h1 className='text-3xl font-semibold tracking-tight'>Download</h1>
          <p className='mt-2 text-muted-foreground'>
            Version {release.version}
            {release.isPrerelease && <span className='ml-1'>(pre-release)</span>}
            {' · '}
            <a href={release.htmlUrl} target='_blank' rel='noopener noreferrer' className='hover:text-foreground'>
              Release notes
            </a>
          </p>
        </div>

        {/* Download table */}
        <div className='mt-12 max-w-3xl'>
          <table className='w-full'>
            <thead>
              <tr className='border-b text-left'>
                <th className='pb-4 font-medium'>Platform</th>
                <th className='pb-4 font-medium'>Architecture</th>
                <th className='pb-4 font-medium'>Format</th>
                <th className='pb-4 font-medium text-right'>Size</th>
              </tr>
            </thead>
            <tbody className='text-sm'>
              {/* macOS */}
              {macosAssets.length > 0 ? (
                macosAssets.map((asset, i) => (
                  <tr key={asset.name} className='border-b'>
                    <td className='py-4'>{i === 0 && <span className='font-medium'>macOS</span>}</td>
                    <td className='py-4 text-muted-foreground'>{getArchLabel(asset.arch)}</td>
                    <td className='py-4'>
                      <a href={asset.downloadUrl} download className='text-foreground hover:underline'>
                        .dmg
                      </a>
                    </td>
                    <td className='py-4 text-right text-muted-foreground'>{formatBytes(asset.size)}</td>
                  </tr>
                ))
              ) : (
                <tr className='border-b'>
                  <td className='py-4 font-medium'>macOS</td>
                  <td className='py-4 text-muted-foreground' colSpan={3}>
                    Coming soon
                  </td>
                </tr>
              )}

              {/* Windows */}
              {windowsAssets.length > 0 ? (
                windowsAssets.map((asset, i) => (
                  <tr key={asset.name} className='border-b'>
                    <td className='py-4'>{i === 0 && <span className='font-medium'>Windows</span>}</td>
                    <td className='py-4 text-muted-foreground'>{asset.arch === 'x64' ? 'x64' : asset.arch === 'arm64' ? 'ARM64' : '—'}</td>
                    <td className='py-4'>
                      <a href={asset.downloadUrl} download className='text-foreground hover:underline'>
                        {getWindowsLabel(asset)}
                      </a>
                    </td>
                    <td className='py-4 text-right text-muted-foreground'>{formatBytes(asset.size)}</td>
                  </tr>
                ))
              ) : (
                <tr className='border-b'>
                  <td className='py-4 font-medium'>Windows</td>
                  <td className='py-4 text-muted-foreground' colSpan={3}>
                    Coming soon
                  </td>
                </tr>
              )}

              {/* Linux */}
              {linuxAssets.length > 0 ? (
                linuxAssets.map((asset, i) => (
                  <tr key={asset.name} className='border-b'>
                    <td className='py-4'>{i === 0 && <span className='font-medium'>Linux</span>}</td>
                    <td className='py-4 text-muted-foreground'>{asset.arch === 'x64' ? 'x64' : asset.arch === 'arm64' ? 'ARM64' : '—'}</td>
                    <td className='py-4'>
                      <a href={asset.downloadUrl} download className='text-foreground hover:underline'>
                        {getLinuxLabel(asset.name)}
                      </a>
                    </td>
                    <td className='py-4 text-right text-muted-foreground'>{formatBytes(asset.size)}</td>
                  </tr>
                ))
              ) : (
                <tr className='border-b'>
                  <td className='py-4 font-medium'>Linux</td>
                  <td className='py-4 text-muted-foreground' colSpan={3}>
                    Coming soon
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* macOS signing note */}
        <div className='mt-16 max-w-xl'>
          <h2 className='text-lg font-medium'>macOS not signed</h2>
          <p className='mt-2 text-sm text-muted-foreground leading-relaxed'>
            The macOS app isn't signed with an Apple Developer certificate yet. This requires a $99/year developer account. As a student, I'd appreciate any support towards this goal.
          </p>
          <div className='mt-4'>
            <a href={donateUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground'>
              Support signing
              <ExternalLink className='h-3 w-3' />
            </a>
          </div>
        </div>

        {/* Installation instructions */}
        <div className='mt-16 max-w-xl'>
          <h2 className='text-lg font-medium'>Installation</h2>
          <dl className='mt-4 space-y-4 text-sm'>
            <div>
              <dt className='font-medium'>macOS</dt>
              <dd className='mt-1 text-muted-foreground'>Open the .dmg file and drag QueryStudio to Applications. On first launch, right-click and select "Open" to bypass Gatekeeper.</dd>
            </div>
            <div>
              <dt className='font-medium'>Windows</dt>
              <dd className='mt-1 text-muted-foreground'>Run the .msi installer or .exe file. You may need to allow the app through Windows Defender.</dd>
            </div>
            <div>
              <dt className='font-medium'>Linux</dt>
              <dd className='mt-1 text-muted-foreground'>Use your package manager for .deb or .rpm files, or run the AppImage directly after making it executable.</dd>
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
