import { apiClient } from "./client";
import type { PdfInfo } from "../../types/pdfInfo";

export type ProgressCallback = (percent: number) => void;

function toProgressHandler(onProgress?: ProgressCallback) {
  if (!onProgress) return undefined;
  return (event: { loaded: number; total?: number }) => {
    if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
  };
}

async function postForBlob(path: string, formData: FormData, onProgress?: ProgressCallback): Promise<Blob> {
  const response = await apiClient.post(path, formData, {
    responseType: "blob",
    onUploadProgress: toProgressHandler(onProgress),
  });
  return response.data as Blob;
}

export async function infoPdf(file: File): Promise<PdfInfo> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<PdfInfo>("/pdf/info", formData);
  return response.data;
}

export async function mergePdfs(files: File[], onProgress?: ProgressCallback): Promise<Blob> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return postForBlob("/pdf/merge", formData, onProgress);
}

export async function splitPdf(file: File, ranges: string, onProgress?: ProgressCallback): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  if (ranges) formData.append("ranges", ranges);
  return postForBlob("/pdf/split", formData, onProgress);
}

export async function compressPdf(file: File, level: string, onProgress?: ProgressCallback): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("level", level);
  return postForBlob("/pdf/compress", formData, onProgress);
}

export async function rotatePdf(
  file: File,
  angle: string,
  pages: string,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("angle", angle);
  if (pages) formData.append("pages", pages);
  return postForBlob("/pdf/rotate", formData, onProgress);
}

export async function pdfToImages(
  file: File,
  format: string,
  dpi: string,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("format", format);
  formData.append("dpi", dpi);
  return postForBlob("/pdf/to-images", formData, onProgress);
}

export async function imagesToPdf(files: File[], onProgress?: ProgressCallback): Promise<Blob> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return postForBlob("/pdf/images-to-pdf", formData, onProgress);
}

export async function pdfToWord(file: File, onProgress?: ProgressCallback): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  return postForBlob("/pdf/to-word", formData, onProgress);
}

export async function wordToPdf(file: File, onProgress?: ProgressCallback): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  return postForBlob("/pdf/word-to-pdf", formData, onProgress);
}

export async function protectPdf(
  file: File,
  password: string,
  ownerPassword: string,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("password", password);
  if (ownerPassword) formData.append("ownerPassword", ownerPassword);
  return postForBlob("/pdf/protect", formData, onProgress);
}

export async function unlockPdf(file: File, password: string, onProgress?: ProgressCallback): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("password", password);
  return postForBlob("/pdf/unlock", formData, onProgress);
}

export async function watermarkPdf(
  file: File,
  text: string,
  fontSize: string,
  opacity: string,
  color: string,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("text", text);
  formData.append("fontSize", fontSize);
  formData.append("opacity", opacity);
  formData.append("color", color);
  return postForBlob("/pdf/watermark", formData, onProgress);
}

export async function deletePages(file: File, pages: string, onProgress?: ProgressCallback): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("pages", pages);
  return postForBlob("/pdf/delete-pages", formData, onProgress);
}

export async function extractPages(file: File, pages: string, onProgress?: ProgressCallback): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("pages", pages);
  return postForBlob("/pdf/extract-pages", formData, onProgress);
}

export async function addPageNumbers(
  file: File,
  position: string,
  start: string,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("position", position);
  formData.append("start", start);
  return postForBlob("/pdf/page-numbers", formData, onProgress);
}
