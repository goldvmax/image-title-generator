"use client";

import { useState, useRef, useEffect } from "react";
import OutputCard from "@/components/OutputCard";
import { ImageMetadata } from "@/lib/generateTitles";

type Status = "idle" | "loading" | "done" | "error";

interface Result {
  title: string;
  tags: string;
  description: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;
const API_KEY_STORAGE = "anthropic_api_key";

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 0, height: 0 }); };
    img.src = url;
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // localStorage からAPIキーを復元
  useEffect(() => {
    const saved = localStorage.getItem(API_KEY_STORAGE);
    if (saved) setApiKey(saved);
  }, []);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    if (value) {
      localStorage.setItem(API_KEY_STORAGE, value);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
  };

  const generateFromFile = async (file: File) => {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) { setError("対応形式は JPEG / PNG / WebP です。"); return; }
    if (file.size > MAX_SIZE) { setError("ファイルサイズは 5MB 以内にしてください。"); return; }

    const dimensions = await getImageDimensions(file);
    const meta: ImageMetadata = { name: file.name, type: file.type, size: file.size, ...dimensions };

    setImage(file);
    setMetadata(meta);
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setResult(null);
    setStatus("loading");

    const formData = new FormData();
    formData.append("image", file);
    formData.append("metadata", JSON.stringify(meta));

    const headers: HeadersInit = {};
    if (apiKey) headers["x-anthropic-key"] = apiKey;

    try {
      const res = await fetch("/api/generate-title", { method: "POST", headers, body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "生成に失敗しました。しばらく時間をおいて再試行してください。"); setStatus("error"); return; }
      setResult(data);
      setStatus("done");
    } catch {
      setError("生成に失敗しました。しばらく時間をおいて再試行してください。");
      setStatus("error");
    }
  };

  const handleRegenerate = async () => { if (image) await generateFromFile(image); };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImage(null); setPreviewUrl(null); setMetadata(null);
    setStatus("idle"); setResult(null); setError(null);
  };

  const isLoading = status === "loading";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-semibold text-gray-900">画像タイトル生成</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            画像から読み取れる特徴だけをもとに、タイトル・タグ・説明文を生成します
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">

        {/* API Key input */}
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="api-key" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Anthropic API Key
            </label>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${apiKey ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
              {apiKey ? "設定済み（AIで解析）" : "未設定（モック出力）"}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              id="api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="sk-ant-..."
              aria-label="Anthropic APIキーを入力"
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 font-mono"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? "APIキーを隠す" : "APIキーを表示する"}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {showKey ? "隠す" : "表示"}
            </button>
            {apiKey && (
              <button
                onClick={() => handleApiKeyChange("")}
                aria-label="APIキーをクリアする"
                className="px-3 py-2 rounded-lg border border-red-100 bg-red-50 text-xs text-red-500 hover:bg-red-100 transition-colors"
              >
                クリア
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">
            入力するとブラウザに保存され、次回以降も使われます。未入力の場合はモック出力です。
          </p>
        </div>

        {/* Upload zone */}
        <div
          role="button"
          aria-label="画像をアップロード（クリックまたはドラッグ&ドロップ）"
          tabIndex={0}
          onClick={() => !isLoading && inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && !isLoading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setIsDragging(false);
            if (isLoading) return;
            const file = e.dataTransfer.files[0];
            if (file) generateFromFile(file);
          }}
          className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            isLoading ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
            : isDragging ? "cursor-pointer border-indigo-400 bg-indigo-50"
            : "cursor-pointer border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            aria-hidden="true"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) generateFromFile(file); e.target.value = ""; }}
          />
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <span aria-hidden="true" className="inline-block h-6 w-6 rounded-full border-2 border-gray-300 border-t-indigo-500 animate-spin" />
              <p className="text-sm text-gray-500">{apiKey ? "AIで解析中..." : "生成中..."}</p>
            </div>
          ) : image ? (
            <div>
              <p className="text-sm font-medium text-gray-800">{image.name}</p>
              <p className="text-xs text-gray-400 mt-1">クリックで別の画像に変更（即座に再生成）</p>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-3 select-none">🖼️</div>
              <p className="text-sm font-medium text-gray-700">クリックまたはドラッグ&ドロップ</p>
              <p className="text-xs text-gray-400 mt-1">JPEG / PNG / WebP・5MB 以内</p>
            </div>
          )}
        </div>

        {/* Preview + Metadata */}
        {previewUrl && metadata && (
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="アップロードした画像のプレビュー" className="w-full max-h-64 object-contain" />
            <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-x-5 gap-y-1">
              <MetaItem label="ファイル名" value={metadata.name} />
              <MetaItem label="種別" value={metadata.type.replace("image/", "").toUpperCase()} />
              <MetaItem label="サイズ" value={formatBytes(metadata.size)} />
              {metadata.width > 0 && <MetaItem label="解像度" value={`${metadata.width} × ${metadata.height} px`} />}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {status === "done" && result && (
          <div className="space-y-4">
            <OutputCard label="タイトル" text={result.title} />
            <OutputCard label="タグ候補" text={result.tags} />
            <OutputCard label="説明文のたたき台" text={result.description} multiline />
            <div className="flex gap-3 pt-1">
              <button onClick={handleRegenerate} aria-label="同じ画像で再生成する"
                className="flex-1 rounded-xl border border-indigo-200 py-2.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50">
                再生成
              </button>
              <button onClick={handleReset} aria-label="別の画像を使ってリセットする"
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">
                別の画像を使う
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-xs text-gray-500">
      <span className="text-gray-400">{label}:</span> {value}
    </span>
  );
}
