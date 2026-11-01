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

export interface IPullAsideStep {
  kind: "pullAside";
  key: string;
  location: string;
  product: TPlanoProduct;
}

export interface IPlaceStep {
  kind: "place";
  key: string;
  location: string;
  product: TPlanoProduct;
}

export type TChainStep = IMoveStep | IPullAsideStep | IPlaceStep;

export interface IProductToPull {
  location: string;
  product: TPlanoProduct;
}

export interface IMoveChain {
  // Every location the chain visits, in the direction the cards travel
  route: string[];
  // In the order they're physically done, which runs against the direction the cards travel
  steps: TChainStep[];
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

function groupOldCopiesByUpc(oldLayout: TOldLayout): Map<string, IProductToPull[]> {
  const oldCopiesByUpc = new Map<string, IProductToPull[]>();
  const sortedLocations = Object.keys(oldLayout).sort(compareLocations);

  for (const location of sortedLocations) {
    for (const product of oldLayout[location]) {
      oldCopiesByUpc.set(product.upc, [
        ...(oldCopiesByUpc.get(product.upc) ?? []),
        { location, product },
      ]);
    }
  }

  return oldCopiesByUpc;
}

function findNewLocations(upc: string, newLayout: TNewLayout): string[] {
  return Object.keys(newLayout)
    .filter((location) => newLayout[location].upc === upc)
    .sort(compareLocations);
}

function buildMove(source: IProductToPull, toLocation: string): IMoveStep {
  return {
    kind: "move",
    key: `${source.location}:${toLocation}:${source.product.upc}`,
    fromLocation: source.location,
    toLocation,
    product: source.product,
  };
}

// Both lists run in natural order. A card that keeps any of its old locations gets no moves at
// all: the scanner finds it at its gained locations later.
function assignOldCopies(
  oldCopies: IProductToPull[],
  newLocations: string[]
): { moves: IMoveStep[]; extraCopies: IProductToPull[] } {
  const leavingCopies = oldCopies.filter((copy) => !newLocations.includes(copy.location));

  if (leavingCopies.length < oldCopies.length || newLocations.length === 0) {
    return { moves: [], extraCopies: leavingCopies };
  }

  return {
    moves: newLocations.map((toLocation, locationIdx) =>
      buildMove(oldCopies[locationIdx % oldCopies.length], toLocation)
    ),
    extraCopies: oldCopies.slice(newLocations.length),
  };
}

function assignLayouts(
  oldLayout: TOldLayout,
  newLayout: TNewLayout
): { moves: IMoveStep[]; productsToPull: IProductToPull[] } {
  const assignments = [...groupOldCopiesByUpc(oldLayout)].map(([upc, oldCopies]) =>
    assignOldCopies(oldCopies, findNewLocations(upc, newLayout))
  );

  return {
    moves: assignments
      .flatMap(({ moves }) => moves)
      .sort(
        (firstMove, secondMove) =>
          compareLocations(firstMove.fromLocation, secondMove.fromLocation) ||
          compareLocations(firstMove.toLocation, secondMove.toLocation)
      ),
    productsToPull: assignments
      .flatMap(({ extraCopies }) => extraCopies)
      .sort(
        (firstCopy, secondCopy) =>
          compareLocations(firstCopy.location, secondCopy.location) ||
          firstCopy.product.upc.localeCompare(secondCopy.product.upc)
      ),
  };
}

// Each location receives at most one move, so walking backwards from a location can only come
// back to it, run out, or fall into a loop that it isn't part of.
function findLoopFrom(
  startingLocation: string,
  arrivingMoves: Map<string, IMoveStep>
): IMoveStep[] {
  const loopMoves: IMoveStep[] = [];
  const visitedLocations = new Set<string>();
  let currentLocation = startingLocation;

  while (!visitedLocations.has(currentLocation)) {
    visitedLocations.add(currentLocation);
    const arrivingMove = arrivingMoves.get(currentLocation);
    if (arrivingMove === undefined) {
      return [];
    }

    loopMoves.unshift(arrivingMove);
    currentLocation = arrivingMove.fromLocation;
  }

  return currentLocation === startingLocation ? loopMoves : [];
}

function findLoops(moves: IMoveStep[], arrivingMoves: Map<string, IMoveStep>): IMoveStep[][] {
  const loopedLocations = new Set<string>();

  return moves.flatMap((move) => {
    if (loopedLocations.has(move.fromLocation)) {
      return [];
    }

    const loopMoves = findLoopFrom(move.fromLocation, arrivingMoves);
    loopMoves.forEach((loopMove) => loopedLocations.add(loopMove.fromLocation));
    return loopMoves.length > 0 ? [loopMoves] : [];
  });
}

function claimStraightChain(firstMove: IMoveStep, unclaimedMoves: Set<IMoveStep>): IMoveStep[] {
  const chainMoves = [firstMove];
  unclaimedMoves.delete(firstMove);

  const findNextMove = () => {
    const lastLocation = chainMoves[chainMoves.length - 1].toLocation;
    return [...unclaimedMoves].find((move) => move.fromLocation === lastLocation);
  };

  for (let nextMove = findNextMove(); nextMove !== undefined; nextMove = findNextMove()) {
    unclaimedMoves.delete(nextMove);
    chainMoves.push(nextMove);
  }

  return chainMoves;
}

// A fork's branches each become their own chain, and a location in a loop can fork too. So loops
// are claimed first, and a straight chain starts where nothing unclaimed still moves in.
function groupMovesIntoChains(moves: IMoveStep[]): IMoveStep[][] {
  const arrivingMoves = new Map(moves.map((move) => [move.toLocation, move]));
  const loops = findLoops(moves, arrivingMoves);
  const unclaimedMoves = new Set(moves);
  loops.flat().forEach((move) => unclaimedMoves.delete(move));

  const findNextChainStart = () =>
    [...unclaimedMoves].find((move) => {
      const arrivingMove = arrivingMoves.get(move.fromLocation);
      return arrivingMove === undefined || !unclaimedMoves.has(arrivingMove);
    });

  const straightChains: IMoveStep[][] = [];
  for (
    let firstMove = findNextChainStart();
    firstMove !== undefined;
    firstMove = findNextChainStart()
  ) {
    straightChains.push(claimStraightChain(firstMove, unclaimedMoves));
  }

  // Straight first: when both start at one location, a branch has to leave before the loop arrives
  return [...straightChains, ...loops];
}

function buildCircularSteps(chainMoves: IMoveStep[]): TChainStep[] {
  const [heldCardMove, ...remainingMoves] = chainMoves;

  return [
    {
      kind: "pullAside",
      key: `pull-aside:${heldCardMove.key}`,
      location: heldCardMove.fromLocation,
      product: heldCardMove.product,
    },
    ...remainingMoves.reverse(),
    {
      kind: "place",
      key: `place:${heldCardMove.key}`,
      location: heldCardMove.toLocation,
      product: heldCardMove.product,
    },
  ];
}

function buildChain(chainMoves: IMoveStep[], productsToPull: IProductToPull[]): IMoveChain {
  const startingLocation = chainMoves[0].fromLocation;
  const lastLocation = chainMoves[chainMoves.length - 1].toLocation;
  const isCircular = lastLocation === startingLocation;

  return {
    route: [startingLocation, ...chainMoves.map((move) => move.toLocation)],
    steps: isCircular ? buildCircularSteps(chainMoves) : [...chainMoves].reverse(),
    isCircular,
    deadEndPulls: isCircular
      ? []
      : productsToPull.filter((productToPull) => productToPull.location === lastLocation),
  };
}

export function buildMovePlan(oldLayout: TOldLayout, newLayout: TNewLayout): IMovePlan {
  const { moves, productsToPull } = assignLayouts(oldLayout, newLayout);
  const chains = groupMovesIntoChains(moves)
    .map((chainMoves) => buildChain(chainMoves, productsToPull))
    .sort((firstChain, secondChain) => compareLocations(firstChain.route[0], secondChain.route[0]));

  return { chains, productsToPull };
}
