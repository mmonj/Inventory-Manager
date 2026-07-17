import { templates } from "@reactivated";

type TPlanogramUpdate = templates.ProductLocatorPlanogramUpdates["planogram_updates"][number];
type TPlanoSnapshot = TPlanogramUpdate["old_plano"];
type TPlanoProduct = TPlanoSnapshot[string];

export interface IProductMove {
  fromLocation: string;
  toLocation: string;
  product: TPlanoProduct;
}

function findLocationForProduct(planoSnapshot: TPlanoSnapshot, upc: string): string | undefined {
  return Object.keys(planoSnapshot).find((location) => planoSnapshot[location].upc === upc);
}

export function chaseProductMoves(
  oldPlano: TPlanoSnapshot,
  newPlano: TPlanoSnapshot,
  startingLocations: string[]
): IProductMove[][] {
  const locationsProcessed = new Set<string>();
  const chains: IProductMove[][] = [];

  for (const startingLocation of startingLocations) {
    let currentLocation: string | undefined = startingLocation;
    const product = oldPlano[currentLocation];

    if (product === undefined) {
      continue;
    }

    const chain: IProductMove[] = [];

    do {
      if (locationsProcessed.has(currentLocation)) {
        break;
      }
      locationsProcessed.add(currentLocation);

      const currentProduct = oldPlano[currentLocation];
      if (currentProduct === undefined) {
        break;
      }

      const newLocation = findLocationForProduct(newPlano, currentProduct.upc);
      if (newLocation !== undefined && newLocation !== currentLocation) {
        chain.push({
          fromLocation: currentLocation,
          toLocation: newLocation,
          product: currentProduct,
        });
      }

      currentLocation = newLocation;
    } while (currentLocation !== undefined);

    if (chain.length > 0) {
      chains.push(chain);
    }
  }

  return chains;
}
