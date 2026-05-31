import { useRef, useState, type DragEvent } from 'react';
import { File as FileIcon, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FileDropzoneProps {
  accept: string;
  label: string;
  helper?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export function FileDropzone({
  accept,
  label,
  helper,
  file,
  onChange,
  disabled,
}: FileDropzoneProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files[0];
    if (dropped) onChange(dropped);
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={cn(
        'relative block border border-dashed p-6 cursor-pointer transition',
        isDragging
          ? 'border-accent bg-accent/10'
          : 'border-ink-600 bg-ink-900/40 hover:border-ink-400 hover:bg-ink-900/60',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onChange(f);
        }}
      />
      {file ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center bg-accent/15 text-accent shrink-0">
            <FileIcon size={18} strokeWidth={1.8} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate text-slate-100">{file.name}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-widest tabular-nums">
              {formatBytes(file.size)} · prêt
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onChange(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="inline-flex items-center justify-center h-8 w-8 text-slate-500 hover:text-signal-bad hover:bg-signal-bad/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Retirer le fichier"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center bg-ink-800 text-slate-400 shrink-0">
            <UploadCloud size={18} strokeWidth={1.8} />
          </span>
          <div className="flex-1">
            <p className="text-sm text-slate-300">{label}</p>
            {helper && (
              <p className="text-[10px] text-slate-500 mt-1 font-mono uppercase tracking-widest">
                {helper}
              </p>
            )}
          </div>
        </div>
      )}
    </label>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
