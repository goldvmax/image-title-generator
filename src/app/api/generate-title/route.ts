import { NextRequest, NextResponse } from "next/server";
import { generateTitles, ImageMetadata } from "@/lib/generateTitles";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  const metadataRaw = formData.get("metadata") as string | null;

  // リクエストヘッダーからAPIキーを取得（なければ環境変数にフォールバック）
  const apiKey =
    req.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY || undefined;

  if (!file) {
    return NextResponse.json(
      { error: "画像が選択されていません。画像をアップロードしてから実行してください。" },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "対応形式は JPEG / PNG / WebP です。" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "ファイルサイズは 5MB 以内にしてください。" },
      { status: 400 }
    );
  }

  let metadata: ImageMetadata;
  try {
    metadata = metadataRaw
      ? JSON.parse(metadataRaw)
      : { name: file.name, type: file.type, size: file.size, width: 0, height: 0 };
  } catch {
    return NextResponse.json({ error: "メタデータの解析に失敗しました。" }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const result = await generateTitles(base64, file.type, metadata, apiKey);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-title]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
