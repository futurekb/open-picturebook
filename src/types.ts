export type PageTransition = 'slide' | 'fade' | 'zoom' | 'none'
export type TextPosition = 'bottom' | 'top' | 'overlay'

export interface BookPage {
  id: string
  image?: string
  imageAlt: string
  text: string
  audio?: string
  durationMs: number
  transition: PageTransition
  textPosition: TextPosition
}

export interface PictureBook {
  schema: 'open-picturebook/v1'
  id: string
  title: string
  author: string
  description: string
  cover?: string
  language: string
  createdAt: string
  updatedAt: string
  pages: BookPage[]
}

export interface CatalogEntry {
  title: string
  author: string
  description?: string
  cover?: string
  source: string
}
