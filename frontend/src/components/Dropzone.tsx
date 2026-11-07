import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ArrowDown, ArrowUp, UploadCloud, X } from "lucide-react";

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface DropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept: Record<string, string[]>;
  multiple?: boolean;
  hint?: string;
}

export function Dropzone({ files, onFilesChange, accept, multiple = true, hint }: DropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      onFilesChange(multiple ? [...files, ...accepted] : accepted.slice(0, 1));
    },
    [files, onFilesChange, multiple],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxFiles: multiple ? undefined : 1,
    maxSize: MAX_FILE_SIZE_BYTES,
  });

  function removeAt(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  function moveBy(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= files.length) return;

    const next = [...files];
    [next[index], next[target]] = [next[target], next[index]];
    onFilesChange(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition ${
          isDragActive ? "border-neutral-900 bg-neutral-100" : "border-neutral-300 bg-neutral-50"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="text-neutral-400" size={32} />
        <p className="text-neutral-600">
          Drag & drop {multiple ? "files" : "a file"} here, or{" "}
          <span className="font-medium text-neutral-900 underline">browse</span>
        </p>
        <p className="text-xs text-neutral-400">
          {hint ?? (multiple ? "Multiple files allowed" : "One file")} — up to {MAX_FILE_SIZE_MB}MB each
        </p>
      </div>

      {fileRejections.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-red-600">
          {fileRejections.map(({ file, errors }) => (
            <li key={file.name}>
              {file.name}: {errors.map((e) => e.message).join(", ")}
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"
            >
              <span className="truncate text-sm text-neutral-700">{file.name}</span>
              <div className="flex items-center gap-1 text-neutral-400">
                {multiple && (
                  <>
                    <button
                      type="button"
                      onClick={() => moveBy(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${file.name} up`}
                      className="rounded-md p-1 hover:bg-neutral-100 disabled:opacity-30"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBy(index, 1)}
                      disabled={index === files.length - 1}
                      aria-label={`Move ${file.name} down`}
                      className="rounded-md p-1 hover:bg-neutral-100 disabled:opacity-30"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={`Remove ${file.name}`}
                  className="rounded-md p-1 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <X size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
