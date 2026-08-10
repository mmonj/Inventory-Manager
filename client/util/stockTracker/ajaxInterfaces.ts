export interface BasicBrandParentCompany {
  short_name?: string | null;
  expanded_name?: string | null;
}

export interface BasicProduct {
  upc?: string;
  name?: string | null;
  parent_company: BasicBrandParentCompany;
}

export interface BasicProductAddition {
  id?: number;
  date_last_scanned?: string | null;
  is_carried?: boolean;
  product: BasicProduct;
}

export interface BasicStore {
  name?: string;
}

export interface BasicWorkCycle {
  start_date?: string;
}

export interface BasicBarcodeSheet {
  id?: number;
  store: BasicStore;
  parent_company: BasicBrandParentCompany | null;
  work_cycle: BasicWorkCycle | null;
  datetime_created?: string;
  product_additions_count?: number;
}
