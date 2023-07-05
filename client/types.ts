import {
  DjangoFormsWidgetsSelect,
  DjangoFormsWidgetsTextarea,
  ReactivatedSerializationWidgetsTextareaAttrs,
} from "reactivated/dist/generated";

export interface scannerContextType {
  scanSuccessCallback: (decodedText: string) => Promise<void>;
  scanErrorCallback: (errorMessage: string) => void;
}

export interface ProductResponseType {
  product: {
    upc: string;
    name: string;
  };
  home_locations: {
    name: string;
    planogram: string;
  }[];
}

export interface LocationUpdateResponseType {
  name: string;
  planogram: string;
}

export const filteredKeys = ["template_name", "is_hidden", "attrs", "tag"];
export type FilteredKeysType = (typeof filteredKeys)[number];

export interface PreliminaryTextAreaProps extends DjangoFormsWidgetsTextarea {
  maxLength?: number;
  className?: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export interface TextAreaProps
  extends Omit<DjangoFormsWidgetsTextarea, FilteredKeysType>,
    Omit<ReactivatedSerializationWidgetsTextareaAttrs, "cols" | "rows"> {
  maxLength?: number;
  className?: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  cols: number;
  rows: number;
}

export interface PreliminarySelectProps extends DjangoFormsWidgetsSelect {
  className?: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

export interface SelectProps extends Omit<DjangoFormsWidgetsSelect, FilteredKeysType> {
  className?: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}
