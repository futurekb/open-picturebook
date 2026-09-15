import type { PictureBook } from '../types'

const art = (bg: string, moon: string, hill: string, text: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"><rect width="1600" height="1000" fill="${bg}"/><circle cx="1250" cy="220" r="105" fill="${moon}"/><path d="M0 820 Q350 500 720 790 T1600 720 V1000 H0Z" fill="${hill}"/><g fill="#fff" opacity=".9"><circle cx="220" cy="170" r="7"/><circle cx="450" cy="250" r="5"/><circle cx="850" cy="140" r="6"/><circle cx="1050" cy="320" r="4"/></g><text x="800" y="500" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="72" font-weight="700">${text}</text></svg>`)}`

export const demoBook: PictureBook = {
  schema: 'open-picturebook/v1',
  id: 'demo-moon-cat',
  title: 'つきよのねこ',
  author: 'Open Picturebook',
  description: 'プレイヤーの操作感を試せるサンプル絵本です。',
  language: 'ja-JP',
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
  cover: art('#26324b', '#ffd97d', '#426b69', 'つきよのねこ'),
  pages: [
    { id: 'd1', image: art('#26324b', '#ffd97d', '#426b69', 'しずかな よる'), imageAlt: '月が見える静かな夜', text: 'ある夜、ちいさな猫は、月のひかりを追いかけました。', durationMs: 6500, transition: 'slide', textPosition: 'bottom' },
    { id: 'd2', image: art('#35506f', '#fff0ad', '#527c68', 'ひかる みち'), imageAlt: '月明かりに照らされた道', text: '月のひかりは、森の奥へつづく道を、そっと照らしていました。', durationMs: 7000, transition: 'fade', textPosition: 'bottom' },
    { id: 'd3', image: art('#1b2941', '#fff4c6', '#315950', 'また あした'), imageAlt: '丘の向こうに浮かぶ月', text: '猫は月に「またあした」と言って、家へ帰りました。', durationMs: 6500, transition: 'zoom', textPosition: 'bottom' }
  ]
}
