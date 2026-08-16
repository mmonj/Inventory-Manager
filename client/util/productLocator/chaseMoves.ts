import { templates } from "@reactivated";

type TPlanogramUpdate = templates.ProductLocatorPlanogramUpdates["planogram_updates"][number];
type TPlanoSnapshot = TPlanogramUpdate["old_plano"];
type TPlanoProduct = TPlanoSnapshot[string];

export interface IProductMove {
  fromLocation: string;
  toLocation: string;
  product: TPlanoProduct;
}

export interface IProductMoveChain {
  moves: IProductMove[];
  // True if the walk looped back onto a location already visited earlier in this same chain
  // (e.g. a straight swap: A1 -> B6, B6 -> A1) rather than stopping because the last location's
  // product has no destination in the new plano. A circular chain has no dead end - every
  // location's contents end up somewhere, so nothing in it should be emptied out and discarded.
  isCircular: boolean;
}

function findLocationForProduct(planoSnapshot: TPlanoSnapshot, upc: string): string | undefined {
  return Object.keys(planoSnapshot).find((location) => planoSnapshot[location].upc === upc);
}

export function chaseProductMoves(
  oldPlano: TPlanoSnapshot,
  newPlano: TPlanoSnapshot,
  startingLocations: string[]
): IProductMoveChain[] {
  const locationsProcessed = new Set<string>();
  const chains: IProductMoveChain[] = [];

  for (const startingLocation of startingLocations) {
    if (locationsProcessed.has(startingLocation)) {
      continue;
    }

    let currentLocation: string | undefined = startingLocation;
    const product = oldPlano[currentLocation];

    // TPlanoSnapshot is a sparse dict at runtime (only locations with a product are keyed),
    // but tsconfig lacks noUncheckedIndexedAccess, so TS treats this lookup as always-defined.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (product === undefined) {
      continue;
    }

    const chain: IProductMove[] = [];
    // Tracks only locations visited by *this* walk, so a cycle can be distinguished from
    // this walk merely running into a location already claimed by an earlier, unrelated chain.
    const locationsVisitedThisChain = new Set<string>();
    let isCircular = false;

    do {
      if (locationsProcessed.has(currentLocation)) {
        isCircular = locationsVisitedThisChain.has(currentLocation);
        break;
      }
      locationsProcessed.add(currentLocation);
      locationsVisitedThisChain.add(currentLocation);

      const currentProduct = oldPlano[currentLocation];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- see comment above
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
      chains.push({ moves: chain, isCircular });
    }
  }

  return chains;
}

export function findEmptiedLocations(
  oldPlano: TPlanoSnapshot,
  newPlano: TPlanoSnapshot,
  changedLocations: string[]
): string[] {
  return changedLocations.filter((location) => {
    const oldProduct = oldPlano[location];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- see comment above
    if (oldProduct === undefined) {
      return false;
    }

    return findLocationForProduct(newPlano, oldProduct.upc) === undefined;
  });
}
