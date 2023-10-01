import { StockTrackerTypesSheetTypeDescriptionInterface } from "@reactivated";

import {
  DjangoFormsWidgetsSelect,
  DjangoFormsWidgetsTextarea,
  ReactivatedSerializationWidgetsTextareaAttrs,
} from "reactivated/dist/generated";
import { z } from "zod";

export type TScanSuccessCallback = (decodedText: string) => Promise<void>;
export type TScanErrorCallback = (errorMessage: string) => void;

export interface IHttpError {
  detail: string;
}

export type TNotFoundErrorList = string[];

export interface IProductAdditionResponse {
  product_info: {
    upc: string;
    name: string;
    store_name: string;
    is_carried: boolean;
  };
}

export interface ApiResponse<T> extends Response {
  json: () => Promise<T>;
}

export type ApiPromise<T> = Promise<ApiResponse<T>>;

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

export const BarcodeSheetSchema = z.object({
  barcodeSheet: z.object({
    barcode_sheet_id: z.number(),
    store_name: z.string(),
    parent_company: z.object({
      short_name: z.string(),
      expanded_name: z.string().nullable(),
      third_party_logo_url: z.string(),
    }),
    product_additions: z.array(
      z.object({
        id: z.number(),
        product: z.object({
          upc: z.string(),
          name: z.string(),
          upc_sections: z.array(z.string()),
          item_image_url: z.string(),
          barcode_b64: z.string(),
        }),
        is_carried: z.boolean(),
        is_new: z.boolean(),
      })
    ),
  }),
  sheetTypeInfo: z.object({
    sheetType: z.string(),
    sheetTypeVerbose: z.string(),
  }),
});

export type sheetTypeType = StockTrackerTypesSheetTypeDescriptionInterface["sheetType"];
