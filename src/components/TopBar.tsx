import { go } from '../lib/routes'

export function TopBar() {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => go('/')}>Open <span>Picturebook</span></button>
      <nav>
        <button className="ghost" onClick={() => go('/')}>本棚</button>
        <button onClick={() => go('/studio')}>絵本を作る</button>
      </nav>
    </header>
  )
}
