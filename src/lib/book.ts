import type { BookPage, PictureBook } from '../types'

export const makeId = () => crypto.randomUUID()

export const blankPage = (): BookPage => ({
  id: makeId(),
  imageAlt: '',
  text: '',
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

export const normalizeBook = (book: PictureBook): PictureBook => ({
  ...book,
  updatedAt: new Date().toISOString(),
  pages: book.pages.length ? book.pages : [blankPage()],
})

export const safeFilename = (title: string) => {
  const normalized = title.normalize('NFKC').trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-')
  return (normalized || 'picturebook').slice(0, 80)
}
