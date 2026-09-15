export type Route =
  | { name: 'home' }
  | { name: 'studio'; id?: string }
  | { name: 'play'; localId?: string; src?: string; demo?: boolean }
  | { name: 'publish'; id?: string }

export function parseRoute(): Route {
  const raw = location.hash.replace(/^#/, '') || '/'
  const [path, query = ''] = raw.split('?')
  const params = new URLSearchParams(query)
  if (path.startsWith('/studio')) return { name: 'studio', id: params.get('id') || undefined }
  if (path.startsWith('/publish')) return { name: 'publish', id: params.get('id') || undefined }
  if (path.startsWith('/play')) return {
    name: 'play',
    localId: params.get('id') || undefined,
    src: params.get('src') || undefined,
    demo: params.get('demo') === '1',
  }
  return { name: 'home' }
}

export const go = (path: string) => { location.hash = path }
