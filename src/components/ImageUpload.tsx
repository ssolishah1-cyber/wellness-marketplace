import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export default function ImageUpload({ folder, onUploaded, label = "Upload image" }: {
  folder: string;
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!ACCEPT.split(",").includes(file.type)) { setError("Use a PNG, JPG, WebP or GIF image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Images must be 5 MB or smaller."); return; }
    setBusy(true);
    try {
      onUploaded(await api.uploadImage(file, folder));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" className="btn-outline px-3 py-1.5 text-xs" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} {label}
      </button>
      {error && <span className="text-xs text-rose-700">{error}</span>}
    </div>
  );
}
