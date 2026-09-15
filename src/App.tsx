import { useEffect, useMemo, useRef, useState, startTransition, ViewTransition } from 'react'
import type { BookPage, CatalogEntry, PictureBook, TextAlign, TextPosition, PageTransition } from './types'
import { BookCard } from './components/BookCard'
import { TopBar } from './components/TopBar'
import { blankPage, newBook, normalizeBook } from './lib/book'
import { deleteBook, getBook, listBooks, saveBook } from './lib/db'
import { demoBook } from './lib/demo'
import { exportBook, fetchPublicBook, fileToDataUrl, imageFileToDataUrl, importBookFile } from './lib/files'
import { go, parseRoute, type Route } from './lib/routes'
import './styles.css'

function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseRoute())
  useEffect(() => {
    const update = () => startTransition(() => setRoute(parseRoute()))
    addEventListener('hashchange', update)
    return () => removeEventListener('hashchange', update)
  }, [])
  return route
}

function hexRgb(hex: string) {
  const value = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return null
  return [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16))
}

function luminance(hex: string) {
  const rgb = hexRgb(hex)
  if (!rgb) return 1
  const values = rgb.map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
}

function contrast(a: string, b: string) {
  const l1 = luminance(a)
  const l2 = luminance(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

function readableColor(text: string | undefined, background: string | undefined) {
  const fg = text || '#242836'
  const bg = background || '#fffdf7'
  if (contrast(fg, bg) >= 3) return fg
  return contrast('#ffffff', bg) >= contrast('#111111', bg) ? '#ffffff' : '#111111'
}

function StoryText({ page }: { page: BookPage }) {
  const ref = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(24)
  const bg = page.textBackground || (page.textPosition === 'overlay' ? '#191b23' : '#fffdf7')
  const fg = readableColor(page.textColor, bg)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const parentWidth = el.parentElement?.clientWidth || 800
      let size = Math.min(30, Math.max(16, parentWidth / 34))
      el.style.fontSize = `${size}px`
      while ((el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) && size > 10) {
        size -= 1
        el.style.fontSize = `${size}px`
      }
      setFontSize(size)
    }
    const frame = requestAnimationFrame(fit)
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    if (el.parentElement) observer.observe(el.parentElement)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [page.text, page.textPosition])

  return <div
    ref={ref}
    className="story-text"
    style={{
      color: fg,
      backgroundColor: bg,
      textAlign: page.textAlign || 'left',
      fontSize,
    }}
    title={fg !== (page.textColor || '#242836') ? '文字と背景のコントラストが不足しているため文字色を自動補正しています' : undefined}
  >{page.text}</div>
}

function Illustration({ page, editable = false, onChange }: { page: BookPage; editable?: boolean; onChange?: (patch: Partial<BookPage>) => void }) {
  const drag = useRef<{ x: number; y: number; startX: number; startY: number; width: number; height: number } | null>(null)
  const x = page.imageX ?? 0
  const y = page.imageY ?? 0
  const scale = page.imageScale ?? 1

  if (!page.image) return null
  return <img
    className={`illustration ${editable ? 'editable-illustration' : ''}`}
    src={page.image}
    alt={page.imageAlt}
    draggable={false}
    style={{ transform: `translate(${x}%, ${y}%) scale(${scale})` }}
    onPointerDown={editable ? e => {
      const rect = e.currentTarget.parentElement?.getBoundingClientRect()
      if (!rect) return
      e.currentTarget.setPointerCapture(e.pointerId)
      drag.current = { x: e.clientX, y: e.clientY, startX: x, startY: y, width: rect.width, height: rect.height }
    } : undefined}
    onPointerMove={editable ? e => {
      if (!drag.current || !onChange) return
      const dx = ((e.clientX - drag.current.x) / drag.current.width) * 100
      const dy = ((e.clientY - drag.current.y) / drag.current.height) * 100
      onChange({ imageX: Math.max(-100, Math.min(100, drag.current.startX + dx)), imageY: Math.max(-100, Math.min(100, drag.current.startY + dy)) })
    } : undefined}
    onPointerUp={editable ? () => { drag.current = null } : undefined}
    onPointerCancel={editable ? () => { drag.current = null } : undefined}
  />
}

function Home() {
  const [books, setBooks] = useState<PictureBook[]>([])
  const [publicBooks, setPublicBooks] = useState<CatalogEntry[]>([])
  const [url, setUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const refresh = () => listBooks().then(v => setBooks(v.map(normalizeBook)))

  useEffect(() => {
    refresh()
    fetch('./catalog.json').then(r => r.json()).then((v: { books?: CatalogEntry[] }) => setPublicBooks(v.books || [])).catch(() => undefined)
  }, [])

  const importFile = async (file?: File) => {
    if (!file) return
    try {
      const book = await importBookFile(file)
      const copy = normalizeBook({ ...book, id: crypto.randomUUID(), title: `${book.title}（コピー）` })
      await saveBook(copy)
      go(`/studio?id=${encodeURIComponent(copy.id)}`)
    } catch (error) { alert(error instanceof Error ? error.message : String(error)) }
  }

  return <><TopBar /><main className="shell">
    <section className="hero"><div><p className="eyebrow">STATIC • LOCAL FIRST • OPEN FORMAT</p><h1>絵本を、作る。<br />公開する。読む。</h1><p className="lead">サーバーもDBも不要。外部の作者もブラウザだけで制作でき、完成した1ファイルをGitHub Pagesなどに置くだけで公開できます。</p><div className="row wrap hero-actions"><button className="primary big" onClick={() => go('/studio')}>新しい絵本を作る</button><button className="secondary big" onClick={() => fileRef.current?.click()}>絵本ファイルを読み込む</button><input ref={fileRef} hidden type="file" accept=".json,.picturebook.json,application/json" onChange={e => importFile(e.target.files?.[0])} /></div></div><div className="hero-book" aria-hidden="true"><div className="hero-page left">つくる</div><div className="hero-page right">よむ</div></div></section>
    <section><div className="section-heading"><div><p className="eyebrow">TRY IT</p><h2>サンプル絵本</h2></div></div><div className="book-grid"><BookCard book={demoBook} onRead={() => go('/play?demo=1')} /></div></section>
    <section><div className="section-heading"><div><p className="eyebrow">ON THIS DEVICE</p><h2>あなたの本棚</h2></div><button onClick={() => go('/studio')}>＋ 新規作成</button></div>{books.length === 0 ? <div className="empty"><strong>まだ絵本がありません</strong><span>作成中のデータはこのブラウザのIndexedDBに自動保存されます。</span></div> : <div className="book-grid">{books.map(book => <BookCard key={book.id} book={book} onRead={() => go(`/play?id=${encodeURIComponent(book.id)}`)} onEdit={() => go(`/studio?id=${encodeURIComponent(book.id)}`)} onDelete={async () => { if (confirm(`「${book.title}」を削除しますか？`)) { await deleteBook(book.id); refresh() } }} />)}</div>}</section>
    {publicBooks.length > 0 && <section><div className="section-heading"><div><p className="eyebrow">PUBLIC CATALOG</p><h2>公開絵本</h2></div></div><div className="public-list">{publicBooks.map((b, i) => <button key={`${b.source}-${i}`} className="public-row" onClick={() => go(`/play?src=${encodeURIComponent(b.source)}`)}><span>{b.title}</span><small>{b.author}</small><strong>読む →</strong></button>)}</div></section>}
    <section className="open-url"><p className="eyebrow">OPEN FROM URL</p><h2>公開済みの絵本をURLで開く</h2><div className="row"><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.github.io/books/book.picturebook.json" /><button disabled={!url.trim()} onClick={() => go(`/play?src=${encodeURIComponent(url.trim())}`)}>開く</button></div></section>
  </main></>
}

function Studio({ id }: { id?: string }) {
  const [book, setBook] = useState<PictureBook | null>(null)
  const [selected, setSelected] = useState(0)
  const [saved, setSaved] = useState(true)
  const saveTimer = useRef<number | undefined>(undefined)

  useEffect(() => { (async () => setBook(normalizeBook(id ? (await getBook(id) || newBook()) : newBook())))() }, [id])
  useEffect(() => {
    if (!book) return
    setSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => { await saveBook(normalizeBook(book)); setSaved(true) }, 450)
    return () => clearTimeout(saveTimer.current)
  }, [book])

  if (!book) return <main className="center">読み込み中…</main>
  const page = book.pages[selected] || book.pages[0]
  const patchBook = (patch: Partial<PictureBook>) => setBook(prev => prev ? ({ ...prev, ...patch, updatedAt: new Date().toISOString() }) : prev)
  const patchPage = (patch: Partial<BookPage>) => setBook(prev => prev ? ({ ...prev, pages: prev.pages.map((p, i) => i === selected ? { ...p, ...patch } : p), updatedAt: new Date().toISOString() }) : prev)
  const addPage = () => { setBook(prev => prev ? ({ ...prev, pages: [...prev.pages, blankPage()] }) : prev); setSelected(book.pages.length) }
  const removePage = () => { if (book.pages.length <= 1) return; patchBook({ pages: book.pages.filter((_, i) => i !== selected) }); setSelected(v => Math.max(0, v - 1)) }
  const movePage = (delta: number) => { const target = selected + delta; if (target < 0 || target >= book.pages.length) return; const pages = [...book.pages]; [pages[selected], pages[target]] = [pages[target], pages[selected]]; patchBook({ pages }); setSelected(target) }
  const pickImage = async (file?: File, cover = false) => { if (!file) return; try { const data = await imageFileToDataUrl(file); cover ? patchBook({ cover: data }) : patchPage({ image: data, imageScale: 1, imageX: 0, imageY: 0 }) } catch (e) { alert(e instanceof Error ? e.message : String(e)) } }
  const pickAudio = async (file?: File) => { if (file) patchPage({ audio: await fileToDataUrl(file) }) }
  const clonePage = () => { const clone = { ...page, id: crypto.randomUUID() }; const pages = [...book.pages]; pages.splice(selected + 1, 0, clone); patchBook({ pages }); setSelected(selected + 1) }
  const currentBg = page.textBackground || (page.textPosition === 'overlay' ? '#191b23' : '#fffdf7')
  const currentFg = page.textColor || '#242836'
  const adjustedFg = readableColor(currentFg, currentBg)

  return <div className="studio-layout">
    <aside className="studio-sidebar"><button className="brand small" onClick={() => go('/')}>Open <span>Picturebook</span></button><div className="save-state">{saved ? '保存済み' : '保存中…'}</div><div className="thumbs">{book.pages.map((p, i) => <button key={p.id} className={`thumb ${i === selected ? 'active' : ''}`} onClick={() => setSelected(i)}><div>{p.image ? <img src={p.image} alt="" /> : <span>{i + 1}</span>}</div><small>{i + 1}</small></button>)}</div><button className="secondary full" onClick={addPage}>＋ ページ追加</button></aside>
    <main className="studio-main"><header className="studio-toolbar"><div className="row"><button className="ghost" onClick={() => go('/')}>← 本棚</button><span className="divider" /><button className="ghost" onClick={() => movePage(-1)}>↑ 前へ</button><button className="ghost" onClick={() => movePage(1)}>↓ 後へ</button></div><div className="row"><button className="secondary" onClick={() => go(`/play?id=${encodeURIComponent(book.id)}`)}>プレビュー</button><button onClick={() => go(`/publish?id=${encodeURIComponent(book.id)}`)}>公開・書き出し</button></div></header>
      <div className="editor-grid">
        <section className="form-panel"><p className="eyebrow">BOOK</p><h2>絵本の情報</h2><label>タイトル<input value={book.title} onChange={e => patchBook({ title: e.target.value })} /></label><label>作者<input value={book.author} onChange={e => patchBook({ author: e.target.value })} placeholder="作者名" /></label><label>紹介文<textarea value={book.description} onChange={e => patchBook({ description: e.target.value })} rows={3} /></label><label className="toggle setting-toggle"><input type="checkbox" checked={book.defaultTts ?? true} onChange={e => patchBook({ defaultTts: e.target.checked })} /><span>再生時にブラウザ読み上げを初期ON</span></label><label className="file-label">表紙画像<input type="file" accept="image/*,.gif" onChange={e => pickImage(e.target.files?.[0], true)} /><span>画像を選ぶ（GIF対応）</span></label>{book.cover && <img className="cover-preview" src={book.cover} alt="表紙プレビュー" />}</section>
        <section className="canvas-panel"><div className={`page-canvas text-${page.textPosition}`}><div className="illustration-layer">{page.image ? <Illustration page={page} editable onChange={patchPage} /> : <div className="drop-hint"><strong>ページ {selected + 1}</strong><span>右側から画像を追加</span></div>}</div>{page.text && <StoryText page={page} />}</div>{page.image && <div className="drag-note">画像をドラッグして位置を調整できます</div>}<div className="page-meta"><strong>{selected + 1} / {book.pages.length}</strong><span>{page.transition} transition</span></div></section>
        <section className="form-panel page-settings"><div className="row between"><div><p className="eyebrow">PAGE {selected + 1}</p><h2>ページ編集</h2></div><div className="row"><button className="ghost" onClick={clonePage}>複製</button><button className="ghost danger" onClick={removePage} disabled={book.pages.length <= 1}>削除</button></div></div>
          <label className="file-label">挿絵<input type="file" accept="image/*,.gif" onChange={e => pickImage(e.target.files?.[0])} /><span>{page.image ? '画像を変更（GIF対応）' : '画像を追加（GIF対応）'}</span></label>
          {page.image && <div className="image-controls"><label>画像の拡大率 <strong>{Math.round((page.imageScale ?? 1) * 100)}%</strong><input type="range" min="0.5" max="3" step="0.05" value={page.imageScale ?? 1} onChange={e => patchPage({ imageScale: Number(e.target.value) })} /></label><div className="two-col"><label>横位置<input type="range" min="-100" max="100" step="1" value={page.imageX ?? 0} onChange={e => patchPage({ imageX: Number(e.target.value) })} /></label><label>縦位置<input type="range" min="-100" max="100" step="1" value={page.imageY ?? 0} onChange={e => patchPage({ imageY: Number(e.target.value) })} /></label></div><button className="secondary full" onClick={() => patchPage({ imageScale: 1, imageX: 0, imageY: 0 })}>画像を中央に戻す</button></div>}
          <label>画像の説明<input value={page.imageAlt} onChange={e => patchPage({ imageAlt: e.target.value })} placeholder="アクセシビリティ用" /></label><label>本文<textarea value={page.text} onChange={e => patchPage({ text: e.target.value })} rows={6} placeholder="むかしむかし…" /></label>
          <div className="two-col"><label>文字枠の位置<select value={page.textPosition} onChange={e => patchPage({ textPosition: e.target.value as TextPosition })}><option value="bottom">下</option><option value="top">上</option><option value="overlay">画像中央</option></select></label><label>文字揃え<select value={page.textAlign || 'left'} onChange={e => patchPage({ textAlign: e.target.value as TextAlign })}><option value="left">左</option><option value="center">中央</option><option value="right">右</option></select></label></div>
          <div className="color-grid"><label>文字色<input type="color" value={currentFg} onChange={e => patchPage({ textColor: e.target.value })} /></label><label>文字枠の色<input type="color" value={currentBg} onChange={e => patchPage({ textBackground: e.target.value })} /></label></div>{adjustedFg !== currentFg && <div className="contrast-warning">文字色と文字枠の色が近いため、表示時は読みやすい色へ自動補正されます。</div>}
          <div className="two-col"><label>ページ演出<select value={page.transition} onChange={e => patchPage({ transition: e.target.value as PageTransition })}><option value="slide">スライド</option><option value="fade">フェード</option><option value="zoom">ズーム</option><option value="none">なし</option></select></label><label>自動送り（秒）<input type="number" min="2" max="120" step="0.5" value={page.durationMs / 1000} onChange={e => patchPage({ durationMs: Math.max(2000, Number(e.target.value) * 1000) })} /></label></div>
          <label className="file-label">ナレーション音声<input type="file" accept="audio/*" onChange={e => pickAudio(e.target.files?.[0])} /><span>{page.audio ? '音声を変更' : '音声を追加'}</span></label>{page.audio && <div className="audio-row"><audio src={page.audio} controls /><button className="ghost danger" onClick={() => patchPage({ audio: undefined })}>削除</button></div>}
        </section>
      </div>
    </main>
  </div>
}

function Player({ book: rawBook }: { book: PictureBook }) {
  const book = normalizeBook(rawBook)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [tts, setTts] = useState(book.defaultTts ?? true)
  const audioRef = useRef<HTMLAudioElement>(null)
  const touchX = useRef<number | null>(null)
  const page = book.pages[index]
  const isLast = index >= book.pages.length - 1
  const speak = (text: string) => new Promise<void>(resolve => { if (!tts || !('speechSynthesis' in window) || !text) return resolve(); speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = book.language || 'ja-JP'; u.onend = () => resolve(); u.onerror = () => resolve(); speechSynthesis.speak(u) })
  const next = () => { if (!isLast) startTransition(() => setIndex(v => v + 1)); else setPlaying(false) }
  const prev = () => { if (index > 0) startTransition(() => setIndex(v => v - 1)) }

  useEffect(() => {
    if (!playing) return
    let timer = 0
    let cancelled = false
    const run = async () => {
      if (page.audio && audioRef.current) { audioRef.current.currentTime = 0; try { await audioRef.current.play() } catch { /* autoplay may be blocked */ } const onEnded = () => !cancelled && next(); audioRef.current.addEventListener('ended', onEnded, { once: true }); timer = window.setTimeout(() => !cancelled && next(), Math.max(page.durationMs, 3000) + 30000) }
      else if (tts && page.text) { await speak(page.text); if (!cancelled) timer = window.setTimeout(next, 600) }
      else timer = window.setTimeout(next, page.durationMs)
    }
    run()
    return () => { cancelled = true; clearTimeout(timer); if ('speechSynthesis' in window) speechSynthesis.cancel(); if (audioRef.current) audioRef.current.pause() }
  }, [index, playing, tts])

  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight' || e.key === ' ') next(); if (e.key === 'ArrowLeft') prev(); if (e.key === 'Escape') go('/') }; addEventListener('keydown', key); return () => removeEventListener('keydown', key) })

  return <div className="player" onTouchStart={e => touchX.current = e.touches[0]?.clientX || null} onTouchEnd={e => { if (touchX.current == null) return; const dx = (e.changedTouches[0]?.clientX || touchX.current) - touchX.current; if (dx < -45) next(); if (dx > 45) prev(); touchX.current = null }}>
    <header className="player-bar"><button className="glass" onClick={() => go('/')}>✕</button><div><strong>{book.title}</strong><span>{book.author}</span></div><div className="row"><label className="toggle"><input type="checkbox" checked={tts} onChange={e => setTts(e.target.checked)} /><span>ブラウザ読み上げ</span></label><button className="glass" onClick={() => document.documentElement.requestFullscreen?.()}>⛶</button></div></header>
    <div className="player-stage"><button className="page-nav prev" onClick={prev} disabled={index === 0} aria-label="前のページ">‹</button><ViewTransition key={page.id} name={`book-page-${page.transition}`}><article className={`reading-page text-${page.textPosition} transition-${page.transition}`}><div className="illustration-layer">{page.image ? <Illustration page={page} /> : <div className="player-empty">No illustration</div>}</div>{page.text && <StoryText page={page} />}{page.audio && <audio ref={audioRef} src={page.audio} controls={!playing} />}</article></ViewTransition><button className="page-nav next" onClick={next} disabled={isLast} aria-label="次のページ">›</button></div>
    <footer className="player-footer"><div className="progress"><span style={{ width: `${((index + 1) / book.pages.length) * 100}%` }} /></div><div className="row between"><span>{index + 1} / {book.pages.length}</span><button className="primary" onClick={() => setPlaying(v => !v)}>{playing ? '一時停止' : '▶ 自動再生'}</button><span>{isLast ? 'おしまい' : ''}</span></div></footer>
  </div>
}

function PlayerLoader({ route }: { route: Extract<Route, { name: 'play' }> }) {
  const [book, setBook] = useState<PictureBook | null>(route.demo ? normalizeBook(demoBook) : null)
  const [error, setError] = useState('')
  useEffect(() => { if (route.demo) return; (async () => { try { const b = route.localId ? await getBook(route.localId) : route.src ? await fetchPublicBook(route.src) : undefined; if (!b) throw new Error('絵本が見つかりません。'); setBook(normalizeBook(b)) } catch (e) { setError(e instanceof Error ? e.message : String(e)) } })() }, [route.localId, route.src, route.demo])
  if (error) return <main className="center"><div className="error-card"><h2>開けませんでした</h2><p>{error}</p><button onClick={() => go('/')}>本棚へ戻る</button></div></main>
  if (!book) return <main className="center">絵本を読み込み中…</main>
  return <Player book={book} />
}

function Publish({ id }: { id?: string }) {
  const [book, setBook] = useState<PictureBook | null>(null)
  const [url, setUrl] = useState('')
  useEffect(() => { if (id) getBook(id).then(b => setBook(b ? normalizeBook(b) : null)) }, [id])
  const playerUrl = useMemo(() => url.trim() ? `${location.origin}${location.pathname}#/play?src=${encodeURIComponent(url.trim())}` : '', [url])
  if (!book) return <main className="center"><div className="error-card"><h2>絵本が見つかりません</h2><button onClick={() => go('/')}>戻る</button></div></main>
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); alert('コピーしました') }
  return <><TopBar /><main className="shell narrow"><section className="publish-hero"><p className="eyebrow">PUBLISH</p><h1>「{book.title}」を公開する</h1><p className="lead">GitHub Pagesだけで運用するため、絵本は自己完結型JSONとして書き出します。画像・GIF・音声もData URLとして1ファイルに入ります。</p></section><section className="step-card"><span className="step-no">1</span><div><h2>絵本ファイルを書き出す</h2><p><code>*.picturebook.json</code> を保存します。このファイルだけで再生できます。</p><button className="primary" onClick={() => exportBook(book)}>絵本ファイルを保存</button></div></section><section className="step-card"><span className="step-no">2</span><div><h2>GitHubに置く</h2><p>自分の公開リポジトリ、またはGitHub Pages用リポジトリにファイルをアップロードします。</p><div className="row wrap"><a className="button secondary" href="https://github.com/new" target="_blank" rel="noreferrer">GitHubでリポジトリを作る ↗</a><a className="button ghost" href="https://docs.github.com/pages" target="_blank" rel="noreferrer">Pagesの説明 ↗</a></div></div></section><section className="step-card"><span className="step-no">3</span><div><h2>公開JSONのURLを共有する</h2><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://username.github.io/repo/my-book.picturebook.json" />{playerUrl && <div className="share-box"><code>{playerUrl}</code><div className="row wrap"><button onClick={() => copy(playerUrl)}>共有リンクをコピー</button>{navigator.share && <button className="secondary" onClick={() => navigator.share({ title: book.title, text: `${book.title} - ${book.author}`, url: playerUrl })}>共有</button>}</div></div>}</div></section><section className="step-card"><span className="step-no">4</span><div><h2>中央の「公開絵本」に載せたい場合</h2><p><code>public/catalog.json</code> にタイトル・作者・公開JSON URLを追加します。</p></div></section></main></>
}

export default function App() {
  const route = useRoute()
  if (route.name === 'studio') return <Studio id={route.id} />
  if (route.name === 'play') return <PlayerLoader route={route} />
  if (route.name === 'publish') return <Publish id={route.id} />
  return <Home />
}
