import { describe, expect, it } from "vitest";

import { chaseProductMoves, findChangedLocations, findRemovedProducts } from "./chaseMoves";

const OLD_VERSION = { upc: "111111111111", name: "Dog Birthday" };
const NEW_VERSION = { upc: "222222222222", name: "Dog Birthday" };
const OTHER_CARD = { upc: "333333333333", name: "Sympathy" };

function chasesFor(
  oldPlano: Parameters<typeof chaseProductMoves>[0],
  newPlano: Parameters<typeof chaseProductMoves>[1]
) {
  return chaseProductMoves(oldPlano, newPlano, findChangedLocations(oldPlano, newPlano));
}

describe("findChangedLocations", () => {
  it("skips a location that keeps its only product", () => {
    expect(findChangedLocations({ A1: [OTHER_CARD] }, { A1: OTHER_CARD })).toEqual([]);
  });

  it("includes a location that drops one of its products", () => {
    expect(findChangedLocations({ A1: [OLD_VERSION, NEW_VERSION] }, { A1: NEW_VERSION })).toEqual([
      "A1",
    ]);
  });

  it("includes a location that only exists in the new layout", () => {
    expect(findChangedLocations({}, { B3: OTHER_CARD })).toEqual(["B3"]);
  });
});

describe("chaseProductMoves", () => {
  it("follows a chain to a location with nowhere further to go", () => {
    const chains = chasesFor(
      { A1: [NEW_VERSION], B3: [OTHER_CARD] },
      { B3: NEW_VERSION, C9: OTHER_CARD }
    );

    expect(chains).toEqual([
      {
        moves: [
          { fromLocation: "A1", toLocation: "B3", product: NEW_VERSION },
          { fromLocation: "B3", toLocation: "C9", product: OTHER_CARD },
        ],
        isCircular: false,
      },
    ]);
  });

  it("marks a straight swap as circular", () => {
    const chains = chasesFor(
      { A1: [NEW_VERSION], B3: [OTHER_CARD] },
      { A1: OTHER_CARD, B3: NEW_VERSION }
    );

    expect(chains).toHaveLength(1);
    expect(chains[0].isCircular).toBe(true);
    expect(chains[0].moves).toHaveLength(2);
  });

  it("moves the one product at a location that has a new place", () => {
    const chains = chasesFor({ A1: [OLD_VERSION, NEW_VERSION] }, { B3: NEW_VERSION });

    expect(chains).toEqual([
      {
        moves: [{ fromLocation: "A1", toLocation: "B3", product: NEW_VERSION }],
        isCircular: false,
      },
    ]);
  });

  it("gives each product its own move when several at a location have new places", () => {
    const chains = chasesFor(
      { A1: [OLD_VERSION, NEW_VERSION] },
      { B3: OLD_VERSION, C9: NEW_VERSION }
    );

    expect(chains.flatMap((chain) => chain.moves)).toEqual([
      { fromLocation: "A1", toLocation: "B3", product: OLD_VERSION },
      { fromLocation: "A1", toLocation: "C9", product: NEW_VERSION },
    ]);
  });
});

describe("findRemovedProducts", () => {
  it("lists a location's products that have no place in the new layout", () => {
    const oldPlano = { A1: [OLD_VERSION, NEW_VERSION] };
    const newPlano = { B3: NEW_VERSION };

    expect(
      findRemovedProducts(oldPlano, newPlano, findChangedLocations(oldPlano, newPlano))
    ).toEqual([{ location: "A1", product: OLD_VERSION }]);
  });

  it("lists an older version left behind when the new version stays put", () => {
    const oldPlano = { A1: [OLD_VERSION, NEW_VERSION] };
    const newPlano = { A1: NEW_VERSION };

    expect(
      findRemovedProducts(oldPlano, newPlano, findChangedLocations(oldPlano, newPlano))
    ).toEqual([{ location: "A1", product: OLD_VERSION }]);
  });
});
