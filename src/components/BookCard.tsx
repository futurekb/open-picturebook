import type { PictureBook } from '../types'

export function BookCard({ book, onRead, onEdit, onDelete }: { book: PictureBook; onRead: () => void; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <article className="book-card">
      <button className="cover-button" onClick={onRead} aria-label={`${book.title}を読む`}>
        {book.cover || book.pages[0]?.image ? <img src={book.cover || book.pages[0]?.image} alt="" /> : <div className="cover-placeholder">📖</div>}
      </button>
      <div className="book-card-body">
        <h3>{book.title}</h3>
        <p className="muted">{book.author || '作者未設定'}</p>
        <p>{book.description || `${book.pages.length}ページの絵本`}</p>
        <div className="row wrap">
          <button onClick={onRead}>読む</button>
          {onEdit && <button className="secondary" onClick={onEdit}>編集</button>}
          {onDelete && <button className="ghost danger" onClick={onDelete}>削除</button>}
        </div>
      </div>
    </article>
  )
}
