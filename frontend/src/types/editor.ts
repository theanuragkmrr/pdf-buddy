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

export interface ShapeElement {
  id: string;
  kind: "shape";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
}

export type EditorElement = TextElement | ImageElement | ShapeElement;

export type EditorTool = "select" | "text" | "draw" | "shape";
