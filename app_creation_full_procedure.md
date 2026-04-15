# アプリ作成手順（全工程）

画像タイトル生成アプリを `/init` から Vercel デプロイまで一通り構築した手順の記録。

## 完成物

- **アプリ名**: 画像タイトル生成
- **公開URL**: https://image-title-generator.vercel.app/
- **リポジトリ**: https://github.com/goldvmax/image-title-generator
- **技術スタック**: Next.js 16 / TypeScript / Tailwind CSS v4 / Claude Vision API

---

## 全工程の手順

### 1. 環境確認

```bash
python --version   # 3.11.5
node --version     # v22.14.0
git --version      # 2.50.0
```

### 2. Next.js セットアップ

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

### 3. /init → CLAUDE.md 作成

- `/init` コマンドでプロジェクトの CLAUDE.md を生成
- コマンド・アーキテクチャ・データフローを記載

### 4. 要件定義を CLAUDE.md に追記

以下のセクションを追記：
- アプリ概要
- 出力仕様（O-01 タイトル / O-02 タグ候補 / O-03 説明文）
- 機能要件（F-01〜F-06）
- 非機能要件（ローディング・エラー・レスポンシブ）
- 画面レイアウト（AA図）
- AI プロンプト方針・JSON スキーマ例

### 5. 実装計画を立てて承認を得る

- 作成ファイル一覧・進める順番・API あり/なしの違い・事前確認事項を整理
- 承認後に実装開始

### 6. モック実装（API なし）

作成ファイル：

| ファイル | 役割 |
|---------|------|
| `src/lib/generateTitles.ts` | 生成ロジック。APIキーあり→実API、なし→モック |
| `src/app/api/generate-title/route.ts` | POST エンドポイント・バリデーション |
| `src/components/OutputCard.tsx` | 出力欄＋個別コピーボタン |
| `src/app/page.tsx` | アップロード・プレビュー・生成・再生成・リセット |
| `src/app/layout.tsx` | タイトル・lang="ja" 更新 |

### 7. Anthropic SDK インストール・API 接続

```bash
npm install @anthropic-ai/sdk
```

- `generateTitles.ts` にAPIキーあり/なしの分岐を実装
- `page.tsx` にAPIキー入力欄を追加（localStorage保存）
- リクエストヘッダー `x-anthropic-key` でキーを送信

### 8. 画像メタデータ抽出

- クライアント側でファイル名・種別・サイズ・縦横ピクセルを取得
- FormData に JSON 文字列で添付
- サーバー側でパースして `generateTitles` に渡す

### 9. 開発サーバーで動作確認

```bash
npm run dev
# http://localhost:3000 で確認
```

### 10. GitHub push

```bash
git add <ファイル群>
git commit -m "feat: 画像タイトル生成アプリの初回実装"
git remote add origin https://github.com/goldvmax/image-title-generator.git
git push -u origin main
```

**注意**: `.env.local` は `.gitignore` の `.env*` で除外済み。push されない。

### 11. Vercel デプロイ

1. vercel.com に GitHub アカウントでログイン
2. 「Add New → Project」→ リポジトリを選択して Import
3. Framework: Next.js（自動検出）
4. 環境変数 `ANTHROPIC_API_KEY` を設定
5. 「Deploy」→ 2〜3分で完了
6. 公開URL: https://image-title-generator.vercel.app/

---

## ポイント・注意事項

- **APIキーは2箇所で管理**: ローカルは `page.tsx` の入力欄（localStorage）、本番は Vercel の環境変数
- **差し替えポイントは1箇所**: `generateTitles.ts` の中身だけ変えれば API 切り替え完了
- **エラーは実メッセージを返す**: catch で握り潰すと原因特定が困難になる
- **画像選択と同時に生成**: `generateFromFile(file)` でファイルを直接渡すことで state 参照ズレを防ぐ
- **git push 後は自動デプロイ**: 以降は `git push` するだけで Vercel が再デプロイする

---

## Anthropic クレジット購入手順

1. https://console.anthropic.com/settings/billing にアクセス
2. 「Buy credits」→ 金額入力（最低 $5）
3. 支払い情報入力（事業税IDは個人なら空欄でOK）
4. 購入後「API Keys」→「Create Key」でキーを発行
5. キーは発行時しか表示されないので必ずコピーして保存
