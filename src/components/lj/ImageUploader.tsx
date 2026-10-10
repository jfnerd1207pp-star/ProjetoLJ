import { useEffect, useMemo, useRef } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

const MAX = 10 * 1024 * 1024;

export function ImageUploader({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const add = (list: FileList | null) => {
    if (!list) return;
    const ok = Array.from(list).filter((f) => f.type.startsWith("image/") && f.size <= MAX);
    onChange([...files, ...ok].slice(0, 6));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cam.current?.click()}
          className="flex h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 text-sm font-semibold text-primary"
        >
          <Camera className="size-6" /> Tirar foto
        </button>
        <button
          type="button"
          onClick={() => gal.current?.click()}
          className="flex h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed bg-muted text-sm font-semibold text-muted-foreground"
        >
          <ImagePlus className="size-6" /> Da galeria
        </button>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => add(e.target.files)} />
      <input ref={gal} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((src, i) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-xl border">
              <img src={src} alt={`Foto ${i + 1}`} className="size-full object-cover" />
              <button
                type="button"
                aria-label="Remover foto"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-foreground/70 text-background"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Até 6 imagens, máx. 10 MB cada.</p>
    </div>
  );
}
