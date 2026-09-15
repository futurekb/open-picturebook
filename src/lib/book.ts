import type { BookPage, PictureBook } from '../types'

export const makeId = () => crypto.randomUUID()

export const blankPage = (): BookPage => ({
  id: makeId(),
  imageAlt: '',
  imageScale: 1,
  imageX: 0,
  imageY: 0,
  text: '',
  textAlign: 'left',
  textColor: '#242836',
  textBackground: '#fffdf7',
  durationMs: 7000,
  transition: 'slide',
  textPosition: 'bottom',
})

export const newBook = (): PictureBook => {
  const now = new Date().toISOString()
  return {
    schema: 'open-picturebook/v1',
    id: makeId(),
    title: '新しい絵本',
    author: '',
    description: '',
    language: 'ja-JP',
    defaultTts: true,
    createdAt: now,
    updatedAt: now,
    pages: [blankPage()],
  }
}

export const isPictureBook = (value: unknown): value is PictureBook => {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<PictureBook>
  return v.schema === 'open-picturebook/v1' && typeof v.title === 'string' && Array.isArray(v.pages)
}

const normalizePage = (page: BookPage): BookPage => ({
  ...blankPage(),
  ...page,
  imageScale: Number.isFinite(page.imageScale) ? Math.min(3, Math.max(0.5, page.imageScale ?? 1)) : 1,
  imageX: Number.isFinite(page.imageX) ? Math.min(100, Math.max(-100, page.imageX ?? 0)) : 0,
  imageY: Number.isFinite(page.imageY) ? Math.min(100, Math.max(-100, page.imageY ?? 0)) : 0,
  textAlign: page.textAlign ?? 'left',
  textColor: page.textColor ?? '#242836',
  textBackground: page.textBackground ?? (page.textPosition === 'overlay' ? '#191b23' : '#fffdf7'),
})

export const normalizeBook = (book: PictureBook): PictureBook => ({
  ...book,
  defaultTts: book.defaultTts ?? true,
  updatedAt: new Date().toISOString(),
  pages: (book.pages.length ? book.pages : [blankPage()]).map(normalizePage),
})

export const safeFilename = (title: string) => {
  const normalized = title.normalize('NFKC').trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-')
  return (normalized || 'picturebook').slice(0, 80)
}
