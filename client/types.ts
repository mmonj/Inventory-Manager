export interface scannerContextType {
  scanSuccessCallback: (decodedText: string) => Promise<void>;
  scanErrorcallback: (errorMessage: string) => void;
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
