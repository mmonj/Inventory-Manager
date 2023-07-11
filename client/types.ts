import { StockTrackerTypesSheetTypeDescriptionInterface } from "@reactivated";

import {
  DjangoFormsWidgetsSelect,
  DjangoFormsWidgetsTextarea,
  ReactivatedSerializationWidgetsTextareaAttrs,
} from "reactivated/dist/generated";
import { z } from "zod";

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

export const BarcodeSheetSchema = z.object({
  barcodeSheet: z.object({
    barcode_sheet_id: z.number(),
    store_name: z.string(),
    parent_company: z.object({
      short_name: z.string(),
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
