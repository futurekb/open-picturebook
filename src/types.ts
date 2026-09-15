export type PageTransition = 'slide' | 'fade' | 'zoom' | 'none'
export type TextPosition = 'bottom' | 'top' | 'overlay'
export type TextAlign = 'left' | 'center' | 'right'

export interface BookPage {
  id: string
  image?: string
  imageAlt: string
  imageScale?: number
  imageX?: number
  imageY?: number
  text: string
  textAlign?: TextAlign
  textColor?: string
  textBackground?: string
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
  defaultTts?: boolean
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
