import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { tools } from "../config/tools";
import { Dropzone } from "../components/Dropzone";
import { Toast } from "../components/Toast";
import { extractErrorMessage } from "../lib/api/errors";
import { downloadBlob } from "../lib/download";
import { loadToolSettings, saveToolSettings } from "../lib/storage";
import type { PdfInfo } from "../types/pdfInfo";

function initialValues(toolId: string): Record<string, string> {
  const tool = tools.find((t) => t.id === toolId);
  const defaults: Record<string, string> = {};
  tool?.fields.forEach((field) => {
    defaults[field.name] = field.defaultValue ?? "";
  });

  const saved = loadToolSettings(toolId);
  return saved ? { ...defaults, ...saved } : defaults;
}

/** "report.pdf" + "compressed.pdf" -> "report-compressed.pdf" — keeps batch zip entries traceable to their source file. */
function deriveBatchEntryName(originalName: string, outputFilename: string): string {
  const ext = outputFilename.split(".").pop() ?? "pdf";
  const suffix = outputFilename.replace(/\.[^.]+$/, "");
  const base = originalName.replace(/\.[^.]+$/, "");
  return `${base}-${suffix}.${ext}`;
}

export function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = tools.find((t) => t.id === toolId);

  const [files, setFiles] = useState<File[]>([]);
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(toolId ?? ""));
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<PdfInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Object URLs aren't garbage-collected automatically — revoke the previous one
  // whenever it's replaced, and on unmount.
  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  if (!tool) {
    return <Navigate to="/" replace />;
  }

  const missingRequiredField = tool.fields.some((field) => field.required && !values[field.name]);
  const canSubmit = files.length >= tool.minFiles && !missingRequiredField && !isLoading;

  function setField(name: string, value: string) {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      saveToolSettings(toolId ?? "", next);
      return next;
    });
  }

  const isPdfOutput = tool.outputFilename?.toLowerCase().endsWith(".pdf") ?? false;
  const isBatchRun = Boolean(tool.batchable) && files.length > 1;

  async function runBatch() {
    const zip = new JSZip();
    const failed: string[] = [];
    let succeeded = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const blob = await tool!.call!([file], values, (pct) => {
          setProgress(Math.round(((i + pct / 100) / files.length) * 100));
        });
        zip.file(deriveBatchEntryName(file.name, tool!.outputFilename ?? "result"), blob);
        succeeded++;
      } catch {
        failed.push(file.name);
      }
    }

    if (succeeded === 0) {
      setError("All files failed to process. Check that each one matches what this tool expects.");
      return;
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `batch-${tool!.id}.zip`);
    setToast(
      failed.length === 0
        ? `All ${succeeded} files processed — zip downloaded`
        : `${succeeded}/${files.length} succeeded (failed: ${failed.join(", ")})`,
    );
  }

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);
    setInfo(null);
    setProgress(0);
    setResultBlob(null);
    setResultUrl(null);

    try {
      if (tool!.resultKind === "info" && tool!.infoCall) {
        setInfo(await tool!.infoCall(files[0]));
        setToast("PDF info loaded");
      } else if (isBatchRun) {
        await runBatch();
      } else if (tool!.call) {
        const blob = await tool!.call(files, values, setProgress);
        if (isPdfOutput) {
          setResultBlob(blob);
          setResultUrl(URL.createObjectURL(blob));
          setToast("Ready — preview below");
        } else {
          downloadBlob(blob, tool!.outputFilename ?? "result");
          setToast("Downloaded successfully");
        }
      }
    } catch (err) {
      setError(await extractErrorMessage(err));
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  }

  const Icon = tool.icon;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft size={16} />
        All tools
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${tool.theme.bg} ${tool.theme.text}`}>
          <Icon size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{tool.title}</h1>
          <p className="text-sm text-neutral-500">{tool.description}</p>
        </div>
      </div>

      <Dropzone
        files={files}
        onFilesChange={setFiles}
        accept={tool.accept}
        multiple={tool.multiple || tool.batchable}
        hint={
          tool.batchable
            ? "Add multiple files to batch-process them — each runs independently and results are zipped together"
            : undefined
        }
      />

      {tool.fields.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {tool.fields.map((field) => (
            <label key={field.name} className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-neutral-700">{field.label}</span>

              {field.type === "select" ? (
                <select
                  value={values[field.name]}
                  onChange={(e) => setField(field.name, e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 focus:border-neutral-900 focus:outline-none"
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={values[field.name]}
                  onChange={(e) => setField(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  className="rounded-lg border border-neutral-300 px-3 py-2 focus:border-neutral-900 focus:outline-none"
                />
              )}
            </label>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full bg-neutral-900 transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {resultUrl && (
        <div className="mt-4 flex flex-col gap-3">
          <iframe
            src={resultUrl}
            title="Result preview"
            className="h-[480px] w-full rounded-xl border border-neutral-200 bg-white"
          />
          <button
            type="button"
            onClick={() => resultBlob && downloadBlob(resultBlob, tool.outputFilename ?? "result")}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-white shadow-sm transition hover:shadow-md ${tool.theme.button}`}
          >
            Download
          </button>
        </div>
      )}

      {info && (
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm">
          <dt className="text-neutral-400">File name</dt>
          <dd className="text-neutral-800">{info.fileName}</dd>
          <dt className="text-neutral-400">Pages</dt>
          <dd className="text-neutral-800">{info.pageCount}</dd>
          <dt className="text-neutral-400">Size</dt>
          <dd className="text-neutral-800">{(info.sizeBytes / 1024).toFixed(1)} KB</dd>
          <dt className="text-neutral-400">Encrypted</dt>
          <dd className="text-neutral-800">{info.encrypted ? "Yes" : "No"}</dd>
          <dt className="text-neutral-400">Page size</dt>
          <dd className="text-neutral-800">
            {info.pageWidth.toFixed(0)} x {info.pageHeight.toFixed(0)} pt
          </dd>
        </dl>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-white shadow-sm transition hover:shadow-md active:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${tool.theme.button}`}
      >
        {isLoading && <Loader2 className="animate-spin" size={18} />}
        {isLoading
          ? "Processing..."
          : tool.resultKind === "info"
            ? "Check PDF"
            : isBatchRun
              ? `Process ${files.length} files`
              : tool.title}
      </button>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
