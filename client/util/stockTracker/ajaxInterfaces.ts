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

