export interface TextElement {
  id: string;
  kind: "text";
  page: number;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

export interface ImageElement {
  id: string;
  kind: "image";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
}

export type EditorElement = TextElement | ImageElement;

export type EditorTool = "select" | "text" | "draw";
