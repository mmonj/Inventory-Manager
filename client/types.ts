export interface scannerContextType {
  scanSuccessCallback: (decodedText: string) => Promise<void>;
  scanErrorcallback: (errorMessage: string) => void;
}

export interface ProductResponseJsonType {
  product: {
    upc: string;
    name: string;
  };
  home_locations: {
    name: string;
    planogram: string;
  }[];
}
