# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

This is a **Next.js 16 App Router** application — an AI-powered image title generator using Claude Vision API.

### Key conventions

- **App Router only**: All routes live under `src/app/`. No Pages Router.
- **Server Components by default**: Add `"use client"` only when you need browser APIs, state, or event handlers.
- **API routes**: Live at `src/app/api/*/route.ts`. Use `NextRequest` / `NextResponse`.
- **Tailwind CSS v4**: Configured via `postcss.config.mjs`. Use utility classes directly — no custom CSS unless necessary.
- **Import alias**: `@/*` maps to `src/*`.

### Data flow

```
User uploads image (client)
  → POST /api/generate-title  (multipart/form-data, base64 image)
  → src/app/api/generate-title/route.ts  (Server, calls Anthropic API)
  → Returns JSON: { titles: string[] }
  → UI renders title cards with copy-to-clipboard
```

### Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Required. Claude API key for image analysis. |

Create `.env.local` at the project root with this key before running.

---

## 要件定義

### アプリ概要

画像をアップロードすると、AI が画像から**読み取れる特徴のみ**をもとに
「タイトル」「タグ候補」「説明文のたたき台」の3種類のテキストを生成するWebアプリ。
推測・補完・装飾による情報の追加は行わない。

---

### 出力仕様

AI が生成する出力は以下の3種類のみ。いずれも画像から直接読み取れる情報だけを使う。

| # | 出力名 | 形式 | ルール |
|---|--------|------|--------|
| O-01 | タイトル | 半角スペース区切りのキーワード列 | 作品種別・衣装・色・背景・季節感・構図・雰囲気などの観点から短く整理。文章にしない。冗長にならないよう語数を絞る。 |
| O-02 | タグ候補 | `#タグ` 形式をスペース区切りで列挙 | 10〜15個を目安に生成。重複を避け、一般的で検索しやすい語を優先する。画像に見えるものだけ。美的印象（かわいい・きれい・美しい・エレガントなど）やポーズ・衣装の雰囲気も含めてよい。 |
| O-03 | 説明文のたたき台 | 2〜4文の短い文章 | 雰囲気・構図・背景・色味などを簡潔に説明。一般向けの自然な文章にする。見えている要素だけを書く。 |

---

### 機能要件

| # | 機能 | 詳細 |
|---|------|------|
| F-01 | 画像アップロード | クリックまたはドラッグ&ドロップで画像を選択。対応形式: JPEG / PNG / WebP。上限サイズ: 5MB。 |
| F-02 | 画像プレビュー | アップロード後、画面内に縮小プレビューを表示する。 |
| F-03 | テキスト生成 | アップロード完了後、O-01〜O-03 の3種を一括生成して表示する。 |
| F-04 | コピーボタン | タイトル・タグ候補・説明文それぞれに**独立した**コピーボタンを配置。他の出力に影響しない。押下後は「コピー済み」表示に切り替わり、2秒後に戻る。 |
| F-05 | 再生成 | 同じ画像で再度生成を実行できるボタンを提供する。 |
| F-06 | リセット | 画像と全出力をクリアして初期状態に戻るボタンを提供する。 |

---

### 非機能要件

- **生成中の状態表示**: ローディングスピナーとメッセージを表示し、ボタンを無効化する。
- **エラー表示**: 以下のケースをインライン（画面内）で通知する。メッセージは原因と対処法を含めて具体的に書く。
  - 画像未選択で生成を実行した場合: 「画像が選択されていません。画像をアップロードしてから実行してください。」
  - 非対応形式: 「対応形式は JPEG / PNG / WebP です。」
  - サイズ超過: 「ファイルサイズは 5MB 以内にしてください。」
  - API エラー: 「生成に失敗しました。しばらく時間をおいて再試行してください。」
- **レスポンシブ**: スマートフォン〜デスクトップで崩れないレイアウト。
- **アクセシビリティ**: インタラクティブ要素に `aria-label` を付与する。

---

### 画面レイアウト（概要）

```
┌─────────────────────────────────────────────┐
│  ヘッダー: アプリ名 + 一行説明                  │
├─────────────────────────────────────────────┤
│  アップロードエリア（初期表示）                  │
│  ┌──────────────────────────────────────┐   │
│  │  アイコン + 「画像をドロップ / クリック」  │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  ← アップロード後に切り替わる結果エリア →         │
│                                             │
│  [画像プレビュー]                             │
│                                             │
│  タイトル _______________________ [コピー]   │
│  タグ候補 _______________________ [コピー]   │
│  説明文  _______________________ [コピー]   │
│          _______________________            │
│                                             │
│  [再生成]          [別の画像を使う（リセット）]  │
└─────────────────────────────────────────────┘
```

---

### AI プロンプト方針

- システムプロンプトで「画像に見えるものだけを出力すること」「推測・補完・装飾禁止」を明示する。
- レスポンスは構造化（JSON）で受け取り、フロントが各フィールドを対応出力欄に流し込む。
- 各出力の生成指示:
  - **title**: 作品種別・衣装・色・背景・季節感・構図・雰囲気の観点で短いキーワードを半角スペース区切りで並べる。文章にしない。
  - **tags**: 一般的で検索しやすい語を `#タグ` 形式で 10〜15個。重複なし。美的印象（#かわいい #きれい #美しい #エレガント など）やポーズ・衣装の雰囲気タグも積極的に含める。
  - **description**: 雰囲気・構図・背景・色味を中心に 2〜4文。一般向けの自然な文体。見えない情報は含めない。
- 出力 JSON スキーマ例:
  ```json
  {
    "title": "イラスト 女性 青ドレス 屋外 夏 俯瞰 明るい",
    "tags": "#イラスト #女性 #青 #ドレス #夏 #屋外 #明るい #俯瞰 #さわやか #晴れ #カラフル #人物",
    "description": "青いドレスを着た女性のイラストです。明るい屋外を背景に、俯瞰気味の構図で描かれています。全体的にさわやかで夏らしい雰囲気があります。"
  }
  ```
