import type { templates } from "@reactivated";

type TPlanogramUpdate = templates.ProductLocatorPlanogramUpdates["planogram_updates"][number];
type TOldLayout = TPlanogramUpdate["old_plano"];
type TNewLayout = TPlanogramUpdate["new_plano"];
type TPlanoProduct = TNewLayout[string];

export interface IMoveStep {
  kind: "move";
  key: string;
  fromLocation: string;
  toLocation: string;
  product: TPlanoProduct;
}

export interface IProductToPull {
  location: string;
  product: TPlanoProduct;
}

export interface IMoveChain {
  // Every location the chain visits, in the direction the cards travel
  route: string[];
  // In the order they're physically done, which is the reverse of the route
  steps: IMoveStep[];
  isCircular: boolean;
  deadEndPulls: IProductToPull[];
}

export interface IMovePlan {
  chains: IMoveChain[];
  productsToPull: IProductToPull[];
}

function compareLocations(firstLocation: string, secondLocation: string): number {
  return firstLocation.localeCompare(secondLocation, undefined, { numeric: true });
}

function findMoves(oldLayout: TOldLayout, newLayout: TNewLayout): IMoveStep[] {
  const moves = Object.entries(oldLayout).flatMap(([fromLocation, products]) =>
    products.flatMap((product) => {
      const newLocations = Object.entries(newLayout)
        .filter(([, newProduct]) => newProduct.upc === product.upc)
        .map(([location]) => location)
        .sort(compareLocations);
      const toLocation = newLocations.at(0);

      return toLocation === undefined || newLocations.includes(fromLocation)
        ? []
        : [
            {
              kind: "move" as const,
              key: `${fromLocation}:${toLocation}:${product.upc}`,
              fromLocation,
              toLocation,
              product,
            },
          ];
    })
  );

  return moves.sort(
    (firstMove, secondMove) =>
      compareLocations(firstMove.fromLocation, secondMove.fromLocation) ||
      compareLocations(firstMove.toLocation, secondMove.toLocation)
  );
}

function findProductsToPull(oldLayout: TOldLayout, newLayout: TNewLayout): IProductToPull[] {
  const newUpcs = new Set(Object.values(newLayout).map((product) => product.upc));

  return Object.entries(oldLayout)
    .sort(([firstLocation], [secondLocation]) => compareLocations(firstLocation, secondLocation))
    .flatMap(([location, products]) =>
      products
        .filter((product) => !newUpcs.has(product.upc))
        .map((product) => ({ location, product }))
    );
}

function claimChainMoves(startingLocation: string, unclaimedMoves: IMoveStep[]): IMoveStep[] {
  const chainMoves: IMoveStep[] = [];
  let currentLocation = startingLocation;

  do {
    const nextMoveIdx = unclaimedMoves.findIndex((move) => move.fromLocation === currentLocation);
    if (nextMoveIdx === -1) {
      break;
    }

    const [nextMove] = unclaimedMoves.splice(nextMoveIdx, 1);
    chainMoves.push(nextMove);
    currentLocation = nextMove.toLocation;
  } while (currentLocation !== startingLocation);

  return chainMoves;
}

function buildChain(chainMoves: IMoveStep[], productsToPull: IProductToPull[]): IMoveChain {
  const startingLocation = chainMoves[0].fromLocation;
  const lastLocation = chainMoves[chainMoves.length - 1].toLocation;
  const isCircular = lastLocation === startingLocation;

  return {
    route: [startingLocation, ...chainMoves.map((move) => move.toLocation)],
    steps: [...chainMoves].reverse(),
    isCircular,
    deadEndPulls: isCircular
      ? []
      : productsToPull.filter((productToPull) => productToPull.location === lastLocation),
  };
}

export function buildMovePlan(oldLayout: TOldLayout, newLayout: TNewLayout): IMovePlan {
  const moves = findMoves(oldLayout, newLayout);
  const productsToPull = findProductsToPull(oldLayout, newLayout);
  const destinations = new Set(moves.map((move) => move.toLocation));
  const unclaimedMoves = [...moves];
  const claimChain = (startingLocation: string) =>
    buildChain(claimChainMoves(startingLocation, unclaimedMoves), productsToPull);

  const chains = moves
    .filter((move) => !destinations.has(move.fromLocation))
    .map((move) => claimChain(move.fromLocation));

  // Every location in a loop is moved into, so loops only turn up once the chain starts are spent
  while (unclaimedMoves.length > 0) {
    chains.push(claimChain(unclaimedMoves[0].fromLocation));
  }

  chains.sort((firstChain, secondChain) =>
    compareLocations(firstChain.route[0], secondChain.route[0])
  );

  return { chains, productsToPull };
}
