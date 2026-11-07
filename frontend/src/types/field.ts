export type FieldType = "text" | "password" | "number" | "select";

export interface SelectOption {
  label: string;
  value: string;
}

export interface ToolField {
  name: string;
  label: string;
  type: FieldType;
  defaultValue?: string;
  options?: SelectOption[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}
