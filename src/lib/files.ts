import type { PictureBook } from '../types'
import { isPictureBook, normalizeBook, safeFilename } from './book'

const MAX_IMAGE_EDGE = 1920
const IMAGE_QUALITY = 0.82

export const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

export async function imageFileToDataUrl(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選択してください。')
  if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) return fileToDataUrl(file)

  const source = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('画像変換に失敗しました。')
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  source.close()
  return canvas.toDataURL('image/webp', IMAGE_QUALITY)
}

export const imageFileToWebpDataUrl = imageFileToDataUrl

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportBook(book: PictureBook) {
  const payload = JSON.stringify(normalizeBook(book), null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const filename = `${safeFilename(book.title)}.picturebook.json`
  const picker = (window as Window & { showSaveFilePicker?: (options: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: 'Open Picturebook', accept: { 'application/json': ['.json'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }
  downloadBlob(blob, filename)
}

export async function importBookFile(file: File) {
  const json = JSON.parse(await file.text()) as unknown
  if (!isPictureBook(json)) throw new Error('Open Picturebook形式のファイルではありません。')
  return normalizeBook(json)
}

export async function fetchPublicBook(url: string) {
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('http/https URLのみ利用できます。')
  const response = await fetch(parsed.toString(), { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`絵本を取得できませんでした (${response.status})`)
  const json = await response.json() as unknown
  if (!isPictureBook(json)) throw new Error('公開先のJSON形式が正しくありません。')
  return normalizeBook(json)
}
