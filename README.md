# Open Picturebook

GitHub Pagesだけで動く、絵本の作成・公開・再生サイトです。バックエンド、DB、APIキーは不要です。

## 主な機能

- ブラウザ上の絵本エディタ
- 画像をWebPへ自動縮小・圧縮
- 本文、ページ遷移、文字位置、自動送り時間、音声をページ単位で設定
- IndexedDBへのローカル自動保存
- 自己完結型 `*.picturebook.json` の読み込み・書き出し
- 公開JSON URLから直接再生
- キーボード、スワイプ、全画面、自動再生
- 音声ファイル再生 + ブラウザSpeech Synthesisによる読み上げ
- React 19.3 `ViewTransition` を使ったページ遷移
- PWA / Service Workerによる基本的なオフライン対応
- GitHub ActionsからGitHub Pagesへデプロイ
- `public/catalog.json` に外部作者のURLを登録して公開本棚を構築

## 技術構成

- React 19.3
- TypeScript 6.0
- Vite 8
- IndexedDB
- View Transition API / React ViewTransition
- File System Access API（対応ブラウザのみ。非対応時は通常ダウンロードへフォールバック）
- Web Share API（対応端末のみ）
- Web Speech API
- GitHub Actions + GitHub Pages

## ローカル実行

```bash
npm install
npm run dev
```

本番ビルド:

```bash
npm run build
```

## GitHub Pagesへ公開

1. このフォルダをGitHubリポジトリへpushします。
2. GitHubの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選びます。
3. `main` へpushすると `.github/workflows/deploy-pages.yml` がビルド・公開します。

`vite.config.ts` は `base: './'` のため、ユーザーサイトでもプロジェクトサイトでも動作します。

## 外部の人が絵本を作る流れ

1. 公開中のサイトで「絵本を作る」を開く。
2. 画像・文章・音声を追加する。途中データはその人のブラウザ内だけに保存されます。
3. 「公開・書き出し」から `*.picturebook.json` を保存する。
4. 作者自身のGitHub Pages等にJSONをアップロードする。
5. JSONの公開URLを共有する。Open Picturebookは `#/play?src=<URL>` で直接再生できます。

つまり、**制作は誰でも可能、ホスティングは作者ごとに分散可能**です。中央サーバーは必要ありません。

## 中央の公開本棚へ掲載する

`public/catalog.json` に外部JSONを登録します。

```json
{
  "books": [
    {
      "title": "つきよのねこ",
      "author": "作者名",
      "description": "月夜の短い絵本",
      "source": "https://username.github.io/books/tsukiyo.picturebook.json"
    }
  ]
}
```

外部作者からの掲載依頼はGitHub Pull Requestで受け付ける運用が適しています。審査・履歴・差し戻しまでGitHub内で完結します。

## Pagesだけで完結させる場合の制約

GitHub Pagesは静的ホスティングなので、サイト自身が匿名ユーザーのファイルを中央DBへ保存することはできません。この実装では次の方法で解決しています。

- 編集中: IndexedDB（作者の端末）
- 作品受け渡し: 自己完結型JSON
- 公開: 作者のGitHub Pages / 任意の静的ホスティング
- 中央掲載: `catalog.json` へのPull Request

認証トークンをフロントエンドへ埋め込む実装はしていません。

## フォーマット

`schema: "open-picturebook/v1"` を持つJSONです。画像・音声はData URLを格納できるため、1ファイルで作品が完結します。
