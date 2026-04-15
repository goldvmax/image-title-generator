import Anthropic from "@anthropic-ai/sdk";

export interface ImageMetadata {
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
}

export interface GenerateResult {
  title: string;
  tags: string;
  description: string;
}

// APIキーがあれば Claude Vision API を使い、なければモックにフォールバックする。
// 差し替えはこの関数の中だけで完結する。
export async function generateTitles(
  base64: string,
  mimeType: string,
  metadata: ImageMetadata,
  apiKey?: string
): Promise<GenerateResult> {
  if (apiKey) {
    return generateWithApi(base64, mimeType, metadata, apiKey);
  }
  return generateMock(metadata);
}

// ── Real API ──────────────────────────────────────────────────────────────────

async function generateWithApi(
  base64: string,
  mimeType: string,
  metadata: ImageMetadata,
  apiKey: string
): Promise<GenerateResult> {
  const client = new Anthropic({ apiKey });

  const mediaType = mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: `あなたは画像を客観的に分析するアシスタントです。
画像に実際に見えているものだけを出力してください。
推測・補完・装飾による情報の追加は禁止です。
必ず以下のJSON形式のみで返答してください（他のテキスト不要）:
{"title":"...","tags":"...","description":"..."}`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: `この画像を分析して、以下の形式でJSONのみ出力してください。

title: 作品種別・キャラクター・衣装・色・背景・季節感・構図・雰囲気などを半角スペース区切りのキーワードで。文章にしない。冗長にしない。
tags: 一般的で検索しやすい語を #タグ 形式で10〜15個。重複なし。美的印象（かわいい・きれい・美しい・エレガントなど）やポーズ・衣装の雰囲気も含める。
description: 雰囲気・構図・背景・色味を中心に2〜4文。一般向けの自然な文体。見えない情報は含めない。

ファイル情報: ${metadata.name} / ${metadata.width}×${metadata.height}px`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("JSONの解析に失敗しました");

  return JSON.parse(jsonMatch[0]) as GenerateResult;
}

// ── Mock ──────────────────────────────────────────────────────────────────────

async function generateMock(metadata: ImageMetadata): Promise<GenerateResult> {
  await new Promise((r) => setTimeout(r, 900));

  const ratio = metadata.width / metadata.height;
  const orientation = ratio > 1.2 ? "横長" : ratio < 0.85 ? "縦長" : "正方形に近い";
  const baseName = metadata.name.replace(/\.[^.]+$/, "");

  const mocks: GenerateResult[] = [
    {
      title: `イラスト 女性 白ドレス 屋外 春 ${orientation}構図 柔らかい`,
      tags: `#イラスト #女性 #白ドレス #春 #屋外 #かわいい #きれい #柔らかい雰囲気 #花びら #明るい #エレガント #ポートレート #${orientation}`,
      description: `白いドレスを着た女性のイラストです（${baseName}）。${orientation}の構図で、屋外の明るい背景の前に立っています。柔らかい光と花びらが漂い、春らしい穏やかな雰囲気があります。`,
    },
    {
      title: `イラスト 女性 着物 振り返りポーズ 和風 ${orientation}構図`,
      tags: `#イラスト #女性 #着物 #和風 #振り返り #美しい #エレガント #日本風 #黒髪 #凛とした #上品 #ポートレート #${orientation}`,
      description: `着物を着た女性が振り返るポーズのイラストです（${baseName}）。${orientation}の構図で描かれており、黒髪と和装が印象的です。落ち着いた色調で上品な雰囲気があります。`,
    },
    {
      title: `山 空 雲 緑 自然 風景 ${orientation}構図 青空`,
      tags: `#自然 #風景 #山 #空 #雲 #青空 #緑 #木々 #アウトドア #写真 #景色 #屋外 #${orientation}`,
      description: `山と青空が広がる自然の風景です（${baseName}）。${orientation}の構図で撮影されており、白い雲が空に浮かんでいます。手前には緑豊かな木々が見えます。`,
    },
  ];

  return mocks[Math.floor(Math.random() * mocks.length)];
}
