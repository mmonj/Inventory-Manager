import { templates } from "@reactivated";

type TPlanogramUpdate = templates.ProductLocatorPlanogramUpdates["planogram_updates"][number];
type TOldPlano = TPlanogramUpdate["old_plano"];
type TNewPlano = TPlanogramUpdate["new_plano"];
type TPlanoProduct = TNewPlano[string];

export interface IProductMove {
  fromLocation: string;
  toLocation: string;
  product: TPlanoProduct;
}

export interface IProductMoveChain {
  moves: IProductMove[];
  // True if the walk looped back onto a location already visited earlier in this same chain
  // (e.g. a straight swap: A1 -> B6, B6 -> A1) rather than stopping because the last location's
  // product has no destination in the new plano. A circular chain has no dead end, so no location
  // needs emptying first for its moves to work.
  isCircular: boolean;
}

export interface IRemovedProduct {
  location: string;
  product: TPlanoProduct;
}

function findLocationForProduct(newPlano: TNewPlano, upc: string): string | undefined {
  return Object.keys(newPlano).find((location) => newPlano[location].upc === upc);
}

// old_plano/new_plano are sparse dicts at runtime (only locations with a product are keyed), but
// tsconfig lacks noUncheckedIndexedAccess, so TS treats these lookups as always-defined.
function getProductsAt(oldPlano: TOldPlano, location: string): TPlanoProduct[] {
  return oldPlano[location] ?? [];
}

export function findChangedLocations(oldPlano: TOldPlano, newPlano: TNewPlano): string[] {
  const allLocations = new Set([...Object.keys(oldPlano), ...Object.keys(newPlano)]);

  return [...allLocations].filter((location) => {
    const oldProducts = getProductsAt(oldPlano, location);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- see getProductsAt
    const newUpc = newPlano[location]?.upc;

    return oldProducts.length !== 1 || oldProducts[0].upc !== newUpc;
  });
}

function claimNextMove(
  oldPlano: TOldPlano,
  newPlano: TNewPlano,
  location: string,
  movesProcessed: Set<string>
): IProductMove | undefined {
  for (const product of getProductsAt(oldPlano, location)) {
    const newLocation = findLocationForProduct(newPlano, product.upc);
    const moveKey = `${location}:${product.upc}`;

    if (newLocation !== undefined && newLocation !== location && !movesProcessed.has(moveKey)) {
      movesProcessed.add(moveKey);
      return { fromLocation: location, toLocation: newLocation, product };
    }
  }

  return undefined;
}

export function chaseProductMoves(
  oldPlano: TOldPlano,
  newPlano: TNewPlano,
  startingLocations: string[]
): IProductMoveChain[] {
  const movesProcessed = new Set<string>();
  const chains: IProductMoveChain[] = [];

  for (const startingLocation of startingLocations) {
    // A location can start more than one chain when several of its products have new places
    for (;;) {
      const chain: IProductMove[] = [];
      // Tracks only locations visited by *this* walk, so a cycle can be distinguished from
      // this walk merely running into a location already claimed by an earlier, unrelated chain.
      const locationsVisitedThisChain = new Set<string>();
      let currentLocation = startingLocation;
      let isCircular = false;

      for (;;) {
        if (locationsVisitedThisChain.has(currentLocation)) {
          isCircular = true;
          break;
        }
        locationsVisitedThisChain.add(currentLocation);

        const move = claimNextMove(oldPlano, newPlano, currentLocation, movesProcessed);
        if (move === undefined) {
          break;
        }

        chain.push(move);
        currentLocation = move.toLocation;
      }

      if (chain.length === 0) {
        break;
      }
      chains.push({ moves: chain, isCircular });
    }
  }

  return chains;
}

export function findRemovedProducts(
  oldPlano: TOldPlano,
  newPlano: TNewPlano,
  changedLocations: string[]
): IRemovedProduct[] {
  return changedLocations.flatMap((location) =>
    getProductsAt(oldPlano, location)
      .filter((product) => findLocationForProduct(newPlano, product.upc) === undefined)
      .map((product) => ({ location, product }))
  );
}
