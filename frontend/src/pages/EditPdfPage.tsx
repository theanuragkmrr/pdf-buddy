import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, MousePointer2, PenLine, Signature, Trash2, Type } from "lucide-react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
// eslint-disable-next-line import/no-unresolved
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Dropzone } from "../components/Dropzone";
import { Toast } from "../components/Toast";
import { downloadBlob } from "../lib/download";
import { exportEditedPdf } from "../lib/pdfExport";
import type { EditorElement, EditorTool, ImageElement, TextElement } from "../types/editor";

GlobalWorkerOptions.workerSrc = pdfjsWorker;

const RENDER_SCALE = 1.5;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function EditPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);

  const [tool, setTool] = useState<EditorTool>("select");
  const [textColor, setTextColor] = useState("#111111");
  const [fontSize, setFontSize] = useState(20);
  const [drawColor, setDrawColor] = useState("#111111");
  const [drawWidth, setDrawWidth] = useState(3);

  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inkByPage = useRef<Record<number, string>>({});

  const [signatureOpen, setSignatureOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const dragRef = useRef<{ id: string; mode: "move" | "resize"; startX: number; startY: number; orig: ImageElement | TextElement } | null>(null);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);


  // Load the chosen PDF into pdf.js once a file is dropped. Reset edit state
  // synchronously (not inside the .then) so a slow load can't race ahead of
  // edits the user already started and wipe them out.
  useEffect(() => {
    if (files.length === 0) return;
    let cancelled = false;
    setPdf(null);
    setNumPages(0);
    setPageNum(1);
    setElements([]);
    inkByPage.current = {};

    files[0]
      .arrayBuffer()
      .then((buf) => getDocument({ data: buf.slice(0) }).promise)
      .then((doc) => {
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not read this PDF.");
      });
    return () => {
      cancelled = true;
    };
  }, [files]);

  // Render the current page to the base canvas whenever page or doc changes.
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    pdf.getPage(pageNum).then(async (page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = canvasRef.current!;
      const ink = inkCanvasRef.current!;
      canvas.width = ink.width = viewport.width;
      canvas.height = ink.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      const inkCtx = ink.getContext("2d")!;
      inkCtx.clearRect(0, 0, ink.width, ink.height);
      const saved = inkByPage.current[pageNum];
      if (saved) {
        const img = new window.Image();
        img.onload = () => inkCtx.drawImage(img, 0, 0);
        img.src = saved;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNum]);

  function canvasPoint(e: React.PointerEvent<HTMLElement>, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function goToPage(next: number) {
    const ink = inkCanvasRef.current;
    if (ink) inkByPage.current[pageNum] = ink.toDataURL("image/png");
    setSelectedId(null);
    setPageNum(next);
  }

  function handleStagePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Clicks that start on a text/image element call stopPropagation in their own
    // handler, so anything that reaches here genuinely hit the canvas itself.
    if (tool === "text") {
      const { x, y } = canvasPoint(e, canvasRef.current!);
      const el: TextElement = { id: uid(), kind: "text", page: pageNum, x, y, text: "Text", fontSize, color: textColor };
      setElements((prev) => [...prev, el]);
      setSelectedId(el.id);
      setTool("select");
    } else if (tool === "select") {
      setSelectedId(null);
    }
  }

  function handleInkPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool !== "draw") return;
    isDrawing.current = true;
    const ctx = inkCanvasRef.current!.getContext("2d")!;
    const { x, y } = canvasPoint(e, inkCanvasRef.current!);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handleInkPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const ctx = inkCanvasRef.current!.getContext("2d")!;
    const { x, y } = canvasPoint(e, inkCanvasRef.current!);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    isDrawing.current = false;
  }

  function clearPageDrawing() {
    const ink = inkCanvasRef.current!;
    ink.getContext("2d")!.clearRect(0, 0, ink.width, ink.height);
    delete inkByPage.current[pageNum];
  }

  function updateElement(id: string, patch: Partial<EditorElement>) {
    setElements((prev) => prev.map((el) => (el.id === id ? ({ ...el, ...patch } as EditorElement) : el)));
  }

  function deleteSelected() {
    if (!selectedId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  }

  function handleElementPointerDown(e: React.PointerEvent<HTMLDivElement>, el: EditorElement, mode: "move" | "resize") {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelectedId(el.id);
    dragRef.current = { id: el.id, mode, startX: e.clientX, startY: e.clientY, orig: el };
  }

  function handleElementPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const dx = (e.clientX - drag.startX) * scaleX;
    const dy = (e.clientY - drag.startY) * scaleY;

    if (drag.mode === "move") {
      updateElement(drag.id, { x: drag.orig.x + dx, y: drag.orig.y + dy });
    } else if (drag.orig.kind === "image") {
      updateElement(drag.id, {
        width: Math.max(20, drag.orig.width + dx),
        height: Math.max(20, drag.orig.height + dy),
      });
    }
  }

  function handleElementPointerUp() {
    dragRef.current = null;
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const maxW = 200;
        const scale = Math.min(1, maxW / img.width);
        const el: ImageElement = {
          id: uid(),
          kind: "image",
          page: pageNum,
          x: 40,
          y: 40,
          width: img.width * scale,
          height: img.height * scale,
          dataUrl: reader.result as string,
        };
        setElements((prev) => [...prev, el]);
        setSelectedId(el.id);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function openSignaturePad() {
    setSignatureOpen(true);
    requestAnimationFrame(() => {
      const ctx = sigCanvasRef.current?.getContext("2d");
      if (ctx && sigCanvasRef.current) ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
    });
  }

  function handleSigPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    isDrawing.current = true;
    const canvas = sigCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = canvasPoint(e, canvas);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handleSigPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const canvas = sigCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = canvasPoint(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function insertSignature() {
    const canvas = sigCanvasRef.current!;
    const el: ImageElement = {
      id: uid(),
      kind: "image",
      page: pageNum,
      x: 60,
      y: (canvasRef.current?.height ?? 600) - 160,
      width: 220,
      height: (220 * canvas.height) / canvas.width,
      dataUrl: canvas.toDataURL("image/png"),
    };
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
    setSignatureOpen(false);
  }

  async function handleExport() {
    if (!files[0]) return;
    setIsExporting(true);
    setError(null);
    setResultUrl(null);
    try {
      const ink = inkCanvasRef.current!;
      const finalInk = { ...inkByPage.current, [pageNum]: ink.toDataURL("image/png") };
      const bytes = await files[0].arrayBuffer();
      const blob = await exportEditedPdf(bytes, elements, finalInk, RENDER_SCALE);
      setResultUrl(URL.createObjectURL(blob));
      setToast("Ready — preview below");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export the PDF.");
    } finally {
      setIsExporting(false);
    }
  }

  const pageElements = elements.filter((el) => el.page === pageNum);
  const selected = elements.find((el) => el.id === selectedId) ?? null;

  if (files.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
          <ArrowLeft size={16} />
          All tools
        </Link>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900">Edit PDF</h1>
          <p className="text-sm text-neutral-500">Add text, draw, drop in images, and sign — right in the browser.</p>
        </div>
        <Dropzone files={files} onFilesChange={setFiles} accept={{ "application/pdf": [".pdf"] }} multiple={false} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft size={16} />
        All tools
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
        <button
          type="button"
          onClick={() => setTool("select")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${tool === "select" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
        >
          <MousePointer2 size={16} /> Select
        </button>
        <button
          type="button"
          onClick={() => setTool("text")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${tool === "text" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
        >
          <Type size={16} /> Text
        </button>
        <button
          type="button"
          onClick={() => setTool("draw")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${tool === "draw" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
        >
          <PenLine size={16} /> Draw
        </button>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          <ImageIcon size={16} /> Image
          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleImageUpload} />
        </label>
        <button
          type="button"
          onClick={openSignaturePad}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          <Signature size={16} /> Signature
        </button>

        <div className="mx-2 h-6 w-px bg-neutral-200" />

        {tool === "text" && (
          <>
            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-8 w-8 rounded" />
            <input
              type="number"
              value={fontSize}
              min={8}
              max={96}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-16 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
            />
          </>
        )}
        {tool === "draw" && (
          <>
            <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="h-8 w-8 rounded" />
            <input
              type="number"
              value={drawWidth}
              min={1}
              max={20}
              onChange={(e) => setDrawWidth(Number(e.target.value))}
              className="w-16 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
            />
            <button type="button" onClick={clearPageDrawing} className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              Clear drawing
            </button>
          </>
        )}
        {selected && (
          <button type="button" onClick={deleteSelected} className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 size={16} /> Delete selected
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 pb-3 text-sm text-neutral-500">
        <button type="button" disabled={pageNum <= 1} onClick={() => goToPage(pageNum - 1)} className="disabled:opacity-30">
          Prev
        </button>
        Page {pageNum} / {numPages}
        <button type="button" disabled={pageNum >= numPages} onClick={() => goToPage(pageNum + 1)} className="disabled:opacity-30">
          Next
        </button>
      </div>

      <div
        className="relative mx-auto select-none overflow-auto rounded-xl border border-neutral-200 bg-neutral-100"
        style={{ touchAction: "none" }}
        onPointerDown={handleStagePointerDown}
      >
        <canvas ref={canvasRef} className="block" />
        <canvas
          ref={inkCanvasRef}
          className="absolute left-0 top-0"
          style={{ cursor: tool === "draw" ? "crosshair" : "default" }}
          onPointerDown={handleInkPointerDown}
          onPointerMove={handleInkPointerMove}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
        />
        {pageElements.map((el) =>
          el.kind === "text" ? (
            <div
              key={el.id}
              onPointerDown={(e) => handleElementPointerDown(e, el, "move")}
              onPointerMove={handleElementPointerMove}
              onPointerUp={handleElementPointerUp}
              className={`absolute cursor-move p-0.5 ${selectedId === el.id ? "outline outline-2 outline-dashed outline-neutral-900" : ""}`}
              style={{ left: el.x, top: el.y - el.fontSize }}
            >
              <textarea
                value={el.text}
                onChange={(e) => updateElement(el.id, { text: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
                rows={1}
                style={{ color: el.color, fontSize: el.fontSize, lineHeight: 1 }}
                className="min-w-[2ch] resize-none overflow-hidden bg-transparent font-sans outline-none"
              />
            </div>
          ) : (
            <div
              key={el.id}
              onPointerDown={(e) => handleElementPointerDown(e, el, "move")}
              onPointerMove={handleElementPointerMove}
              onPointerUp={handleElementPointerUp}
              className={`absolute cursor-move ${selectedId === el.id ? "outline outline-2 outline-dashed outline-neutral-900" : ""}`}
              style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
            >
              <img src={el.dataUrl} alt="" className="h-full w-full object-contain" draggable={false} />
              <div
                onPointerDown={(e) => handleElementPointerDown(e, el, "resize")}
                onPointerMove={handleElementPointerMove}
                onPointerUp={handleElementPointerUp}
                className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-full bg-neutral-900"
              />
            </div>
          ),
        )}
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white shadow-sm transition hover:bg-neutral-800 hover:shadow-md disabled:opacity-40"
      >
        {isExporting ? "Exporting..." : "Export PDF"}
      </button>

      {resultUrl && (
        <div className="mt-4 flex flex-col gap-3">
          <iframe src={resultUrl} title="Edited PDF preview" className="h-[80vh] min-h-[600px] w-full rounded-xl border border-neutral-200 bg-white" />
          <button
            type="button"
            onClick={() => {
              fetch(resultUrl)
                .then((r) => r.blob())
                .then((blob) => downloadBlob(blob, "edited.pdf"));
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white shadow-sm transition hover:bg-neutral-800 hover:shadow-md"
          >
            Download
          </button>
        </div>
      )}

      {signatureOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h3 className="mb-3 font-semibold text-neutral-900">Draw your signature</h3>
            <canvas
              ref={sigCanvasRef}
              width={400}
              height={150}
              className="w-full touch-none rounded-lg border border-neutral-300 bg-white"
              onPointerDown={handleSigPointerDown}
              onPointerMove={handleSigPointerMove}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSignatureOpen(false)} className="rounded-lg px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
                Cancel
              </button>
              <button type="button" onClick={insertSignature} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
