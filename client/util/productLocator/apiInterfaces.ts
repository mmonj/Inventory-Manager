export interface IProductLocation {
  upc: string;
  name: string;
  home_locations: IHomeLocation[];
}

export interface IHomeLocation {
  name: string;
  planogram: string;
}

export interface ILocationUpdateResponseType {
  name: string;
  planogram: string;
}
