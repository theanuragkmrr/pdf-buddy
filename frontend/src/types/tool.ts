import type { LucideIcon } from "lucide-react";
import type { ToolField } from "./field";
import type { PdfInfo } from "./pdfInfo";
import type { ProgressCallback } from "../lib/api/pdfApi";

export interface ToolTheme {
  bg: string;
  text: string;
  ring: string;
  button: string;
}

export type ResultKind = "download" | "info";

export interface ToolDefinition {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  theme: ToolTheme;
  accept: Record<string, string[]>;
  multiple: boolean;
  minFiles: number;
  fields: ToolField[];
  resultKind: ResultKind;
  outputFilename?: string;
  call?: (files: File[], values: Record<string, string>, onProgress?: ProgressCallback) => Promise<Blob>;
  infoCall?: (file: File) => Promise<PdfInfo>;
}
