export interface IProductLocation {
  upc: string;
  name: string;
  home_locations: IHomeLocation[];
}

export interface IHomeLocation {
  pk: number;
  name: string;
  planogram: IPlanogram;
}

export interface IPlanogram {
  pk: number;
  name: string;
  date_start: string;
  date_end: string | null;
}

export interface ILocationUpdateResponseType {
  name: string;
  planogram: string;
}
