import { describe, expect, it } from "vitest";

import { buildMovePlan } from "./movePlan";

const OLD_VERSION = { upc: "111111111111", name: "Dog Birthday" };
const NEW_VERSION = { upc: "222222222222", name: "Dog Birthday" };
const OTHER_CARD = { upc: "333333333333", name: "Sympathy" };
const SECOND_CARD = { upc: "444444444444", name: "Anniversary" };
const REMOVED_CARD = { upc: "555555555555", name: "Graduation" };

const A1_TO_B3 = {
  kind: "move",
  key: "A1:B3:222222222222",
  fromLocation: "A1",
  toLocation: "B3",
  product: NEW_VERSION,
};
const B3_TO_C9 = {
  kind: "move",
  key: "B3:C9:333333333333",
  fromLocation: "B3",
  toLocation: "C9",
  product: OTHER_CARD,
};

describe("buildMovePlan", () => {
  describe("chain discovery", () => {
    const wholeChain = {
      route: ["A1", "B3", "C9"],
      steps: [B3_TO_C9, A1_TO_B3],
      isCircular: false,
      deadEndPulls: [],
    };

    it("lists a chain's steps in the order they're physically done", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION], B3: [OTHER_CARD] },
        { B3: NEW_VERSION, C9: OTHER_CARD }
      );

      expect(plan.chains).toEqual([wholeChain]);
    });

    it("gives one whole chain when the old layout's keys are stored the other way round", () => {
      const plan = buildMovePlan(
        { B3: [OTHER_CARD], A1: [NEW_VERSION] },
        { B3: NEW_VERSION, C9: OTHER_CARD }
      );

      expect(plan.chains).toEqual([wholeChain]);
    });

    it("gives one whole chain when the new layout's keys are stored the other way round", () => {
      const plan = buildMovePlan(
        { B3: [OTHER_CARD], A1: [NEW_VERSION] },
        { C9: OTHER_CARD, B3: NEW_VERSION }
      );

      expect(plan.chains).toEqual([wholeChain]);
    });

    it("gives one whole chain when a location is reached before the chain's start", () => {
      const plan = buildMovePlan(
        { M4: [OTHER_CARD], Z9: [NEW_VERSION], A1: [SECOND_CARD] },
        { M4: NEW_VERSION, A1: OTHER_CARD, B2: SECOND_CARD }
      );

      expect(plan.chains.map((chain) => chain.route)).toEqual([["Z9", "M4", "A1", "B2"]]);
    });

    it("sorts chains by the natural order of their starting location", () => {
      const plan = buildMovePlan(
        { A10: [NEW_VERSION], C3: [OTHER_CARD], A2: [SECOND_CARD] },
        { B1: NEW_VERSION, B2: OTHER_CARD, B3: SECOND_CARD }
      );

      expect(plan.chains.map((chain) => chain.route)).toEqual([
        ["A2", "B3"],
        ["A10", "B1"],
        ["C3", "B2"],
      ]);
    });

    it("finds a straight swap, which has no location that nothing moves into", () => {
      const plan = buildMovePlan(
        { B3: [OTHER_CARD], A1: [NEW_VERSION] },
        { B3: NEW_VERSION, A1: OTHER_CARD }
      );

      expect(plan.chains.map((chain) => [chain.route, chain.isCircular])).toEqual([
        [["A1", "B3", "A1"], true],
      ]);
    });

    it("finds a longer loop alongside a straight chain", () => {
      const plan = buildMovePlan(
        { C1: [NEW_VERSION], A2: [OTHER_CARD], B5: [SECOND_CARD], D1: [REMOVED_CARD] },
        { A2: NEW_VERSION, B5: OTHER_CARD, C1: SECOND_CARD, E1: REMOVED_CARD }
      );

      expect(plan.chains.map((chain) => [chain.route, chain.isCircular])).toEqual([
        [["A2", "B5", "C1", "A2"], true],
        [["D1", "E1"], false],
      ]);
    });
  });

  describe("circular chains", () => {
    it("holds a card aside for a straight swap and places it last", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION], B3: [OTHER_CARD] },
        { A1: OTHER_CARD, B3: NEW_VERSION }
      );

      expect(plan.chains[0].steps).toEqual([
        {
          kind: "pullAside",
          key: "pull-aside:A1:B3:222222222222",
          location: "A1",
          product: NEW_VERSION,
        },
        {
          kind: "move",
          key: "B3:A1:333333333333",
          fromLocation: "B3",
          toLocation: "A1",
          product: OTHER_CARD,
        },
        { kind: "place", key: "place:A1:B3:222222222222", location: "B3", product: NEW_VERSION },
      ]);
    });

    it("works back around a longer loop so each move lands on a freed location", () => {
      const plan = buildMovePlan(
        { C1: [SECOND_CARD], A2: [NEW_VERSION], B5: [OTHER_CARD] },
        { B5: NEW_VERSION, C1: OTHER_CARD, A2: SECOND_CARD }
      );

      expect(plan.chains).toEqual([
        {
          route: ["A2", "B5", "C1", "A2"],
          steps: [
            {
              kind: "pullAside",
              key: "pull-aside:A2:B5:222222222222",
              location: "A2",
              product: NEW_VERSION,
            },
            {
              kind: "move",
              key: "C1:A2:444444444444",
              fromLocation: "C1",
              toLocation: "A2",
              product: SECOND_CARD,
            },
            {
              kind: "move",
              key: "B5:C1:333333333333",
              fromLocation: "B5",
              toLocation: "C1",
              product: OTHER_CARD,
            },
            {
              kind: "place",
              key: "place:A2:B5:222222222222",
              location: "B5",
              product: NEW_VERSION,
            },
          ],
          isCircular: true,
          deadEndPulls: [],
        },
      ]);
    });

    it("gives every step in a plan its own key", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION], B3: [OTHER_CARD], C1: [SECOND_CARD], D2: [REMOVED_CARD] },
        { A1: OTHER_CARD, B3: NEW_VERSION, C1: REMOVED_CARD, D2: SECOND_CARD }
      );

      expect(plan.chains.flatMap((chain) => chain.steps.map((step) => step.key))).toEqual([
        "pull-aside:A1:B3:222222222222",
        "B3:A1:333333333333",
        "place:A1:B3:222222222222",
        "pull-aside:C1:D2:444444444444",
        "D2:C1:555555555555",
        "place:C1:D2:444444444444",
      ]);
    });

    it("leaves a straight chain's steps as plain moves", () => {
      const plan = buildMovePlan({ A1: [NEW_VERSION] }, { B3: NEW_VERSION });

      expect(plan.chains[0].steps).toEqual([A1_TO_B3]);
    });
  });

  describe("several products at one location", () => {
    it("moves the one product that has a new place", () => {
      const plan = buildMovePlan({ A1: [OLD_VERSION, NEW_VERSION] }, { B3: NEW_VERSION });

      expect(plan.chains.map((chain) => chain.route)).toEqual([["A1", "B3"]]);
    });

    it("gives each product its own move when several have new places", () => {
      const plan = buildMovePlan(
        { A1: [OLD_VERSION, NEW_VERSION] },
        { C9: OLD_VERSION, B3: NEW_VERSION }
      );

      expect(plan.chains.map((chain) => chain.route)).toEqual([
        ["A1", "B3"],
        ["A1", "C9"],
      ]);
    });
  });

  describe("cards that stay", () => {
    it("gives no move to a card that stays at A1 and gains C9", () => {
      const plan = buildMovePlan({ A1: [NEW_VERSION] }, { A1: NEW_VERSION, C9: NEW_VERSION });

      expect(plan).toEqual({ chains: [], productsToPull: [] });
    });

    it("pulls a copy of a staying card from an old location it doesn't keep", () => {
      const plan = buildMovePlan({ A1: [NEW_VERSION], A2: [NEW_VERSION] }, { A1: NEW_VERSION });

      expect(plan).toEqual({
        chains: [],
        productsToPull: [{ location: "A2", product: NEW_VERSION }],
      });
    });

    it("pulls that copy rather than sending it to the location the card gains", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION], A2: [NEW_VERSION] },
        { C9: NEW_VERSION, A1: NEW_VERSION }
      );

      expect(plan).toEqual({
        chains: [],
        productsToPull: [{ location: "A2", product: NEW_VERSION }],
      });
    });

    it("stays when the location it keeps isn't its first old location", () => {
      const plan = buildMovePlan({ A1: [NEW_VERSION], A2: [NEW_VERSION] }, { A2: NEW_VERSION });

      expect(plan).toEqual({
        chains: [],
        productsToPull: [{ location: "A1", product: NEW_VERSION }],
      });
    });
  });

  describe("forks", () => {
    it("gives one card going to two new locations a chain per destination", () => {
      const plan = buildMovePlan({ A1: [NEW_VERSION] }, { C9: NEW_VERSION, B3: NEW_VERSION });

      expect(plan).toEqual({
        chains: [
          {
            route: ["A1", "B3"],
            steps: [A1_TO_B3],
            isCircular: false,
            deadEndPulls: [],
          },
          {
            route: ["A1", "C9"],
            steps: [
              {
                kind: "move",
                key: "A1:C9:222222222222",
                fromLocation: "A1",
                toLocation: "C9",
                product: NEW_VERSION,
              },
            ],
            isCircular: false,
            deadEndPulls: [],
          },
        ],
        productsToPull: [],
      });
    });

    it("gives two products leaving one location a chain each", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION, OTHER_CARD] },
        { B3: NEW_VERSION, C9: OTHER_CARD }
      );

      expect(
        plan.chains.map((chain) => [chain.route, chain.steps.map((step) => step.key)])
      ).toEqual([
        [["A1", "B3"], ["A1:B3:222222222222"]],
        [["A1", "C9"], ["A1:C9:333333333333"]],
      ]);
    });

    it("starts the second branch at the fork when it happens part way along a chain", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION], B3: [OTHER_CARD, SECOND_CARD] },
        { B3: NEW_VERSION, C9: OTHER_CARD, D2: SECOND_CARD }
      );

      expect(plan.chains.map((chain) => chain.route)).toEqual([
        ["A1", "B3", "C9"],
        ["B3", "D2"],
      ]);
    });

    it("keeps a branch whole when it runs through a location that sorts before the fork", () => {
      const plan = buildMovePlan(
        { M1: [NEW_VERSION], Z5: [OTHER_CARD, SECOND_CARD], C1: [REMOVED_CARD] },
        { Z5: NEW_VERSION, B1: OTHER_CARD, C1: SECOND_CARD, A1: REMOVED_CARD }
      );

      expect(plan.chains.map((chain) => chain.route)).toEqual([
        ["M1", "Z5", "B1"],
        ["Z5", "C1", "A1"],
      ]);
    });

    it("gives each branch its own dead end", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION], B3: [REMOVED_CARD], C9: [SECOND_CARD] },
        { B3: NEW_VERSION, C9: NEW_VERSION }
      );

      expect(plan.chains.map((chain) => [chain.route, chain.deadEndPulls])).toEqual([
        [["A1", "B3"], [{ location: "B3", product: REMOVED_CARD }]],
        [["A1", "C9"], [{ location: "C9", product: SECOND_CARD }]],
      ]);
    });

    it("keeps a loop whole when one of its locations forks to an earlier location", () => {
      const plan = buildMovePlan(
        { Y1: [OTHER_CARD], Z1: [NEW_VERSION, SECOND_CARD] },
        { Z1: OTHER_CARD, Y1: NEW_VERSION, A1: SECOND_CARD }
      );

      expect(plan.chains.map((chain) => [chain.route, chain.isCircular])).toEqual([
        [["Y1", "Z1", "Y1"], true],
        [["Z1", "A1"], false],
      ]);
    });

    it("starts a loop's steps with the card leaving its first location, not the fork's", () => {
      const plan = buildMovePlan(
        { Y1: [OTHER_CARD], Z1: [NEW_VERSION] },
        { Z1: OTHER_CARD, Y1: NEW_VERSION, A1: NEW_VERSION }
      );

      expect(plan).toEqual({
        chains: [
          {
            route: ["Y1", "Z1", "Y1"],
            steps: [
              {
                kind: "pullAside",
                key: "pull-aside:Y1:Z1:333333333333",
                location: "Y1",
                product: OTHER_CARD,
              },
              {
                kind: "move",
                key: "Z1:Y1:222222222222",
                fromLocation: "Z1",
                toLocation: "Y1",
                product: NEW_VERSION,
              },
              {
                kind: "place",
                key: "place:Y1:Z1:333333333333",
                location: "Z1",
                product: OTHER_CARD,
              },
            ],
            isCircular: true,
            deadEndPulls: [],
          },
          {
            route: ["Z1", "A1"],
            steps: [
              {
                kind: "move",
                key: "Z1:A1:222222222222",
                fromLocation: "Z1",
                toLocation: "A1",
                product: NEW_VERSION,
              },
            ],
            isCircular: false,
            deadEndPulls: [],
          },
        ],
        productsToPull: [],
      });
    });

    it("lists a branch before the loop it leaves when both start at one location", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION], B3: [OTHER_CARD] },
        { A1: OTHER_CARD, B3: NEW_VERSION, C9: NEW_VERSION }
      );

      expect(plan.chains.map((chain) => [chain.route, chain.isCircular])).toEqual([
        [["A1", "C9"], false],
        [["A1", "B3", "A1"], true],
      ]);
    });

    it("comes out the same whatever order the keys are stored in", () => {
      const plan = buildMovePlan(
        {
          E1: [SECOND_CARD],
          A1: [NEW_VERSION],
          C1: [REMOVED_CARD],
          B1: [OTHER_CARD],
          F1: [OLD_VERSION],
          G1: [OLD_VERSION],
        },
        {
          H1: NEW_VERSION,
          B1: NEW_VERSION,
          A1: OTHER_CARD,
          D1: OTHER_CARD,
          F1: REMOVED_CARD,
          E1: OLD_VERSION,
        }
      );
      const reorderedPlan = buildMovePlan(
        {
          A1: [NEW_VERSION],
          B1: [OTHER_CARD],
          C1: [REMOVED_CARD],
          E1: [SECOND_CARD],
          F1: [OLD_VERSION],
          G1: [OLD_VERSION],
        },
        {
          A1: OTHER_CARD,
          B1: NEW_VERSION,
          D1: OTHER_CARD,
          E1: OLD_VERSION,
          F1: REMOVED_CARD,
          H1: NEW_VERSION,
        }
      );

      expect(reorderedPlan).toEqual(plan);
      expect(plan.chains.map((chain) => chain.route)).toEqual([
        ["A1", "H1"],
        ["A1", "B1", "A1"],
        ["B1", "D1"],
        ["C1", "F1", "E1"],
      ]);
      expect(plan.productsToPull).toEqual([
        { location: "E1", product: SECOND_CARD },
        { location: "G1", product: OLD_VERSION },
      ]);
    });

    it("lists every move once, under its own key", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION], B1: [OTHER_CARD], C1: [REMOVED_CARD], E1: [SECOND_CARD] },
        { A1: OTHER_CARD, B1: NEW_VERSION, H1: NEW_VERSION, D1: OTHER_CARD, F1: REMOVED_CARD }
      );

      expect(plan.chains.flatMap((chain) => chain.steps.map((step) => step.key)).sort()).toEqual([
        "A1:H1:222222222222",
        "B1:A1:333333333333",
        "B1:D1:333333333333",
        "C1:F1:555555555555",
        "place:A1:B1:222222222222",
        "pull-aside:A1:B1:222222222222",
      ]);
    });
  });

  describe("one card at several old locations", () => {
    it("supplies the one destination from the first source and pulls the other copy", () => {
      const plan = buildMovePlan({ A1: [NEW_VERSION], A2: [NEW_VERSION] }, { B3: NEW_VERSION });

      expect(plan).toEqual({
        chains: [{ route: ["A1", "B3"], steps: [A1_TO_B3], isCircular: false, deadEndPulls: [] }],
        productsToPull: [{ location: "A2", product: NEW_VERSION }],
      });
    });

    it("takes sources in natural order, whatever order they're stored in", () => {
      const plan = buildMovePlan({ A10: [NEW_VERSION], A2: [NEW_VERSION] }, { B3: NEW_VERSION });

      expect(plan.chains.map((chain) => chain.route)).toEqual([["A2", "B3"]]);
      expect(plan.productsToPull).toEqual([{ location: "A10", product: NEW_VERSION }]);
    });

    it("uses one source per destination, pairing both in natural order", () => {
      const plan = buildMovePlan(
        { A3: [NEW_VERSION], A10: [NEW_VERSION], A2: [NEW_VERSION] },
        { B10: NEW_VERSION, B2: NEW_VERSION }
      );

      expect(plan.chains.map((chain) => chain.route)).toEqual([
        ["A2", "B2"],
        ["A3", "B10"],
      ]);
      expect(plan.productsToPull).toEqual([{ location: "A10", product: NEW_VERSION }]);
    });

    it("reuses the sources in order when there are more destinations than sources", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION], A2: [NEW_VERSION] },
        { B1: NEW_VERSION, B2: NEW_VERSION, B3: NEW_VERSION }
      );

      expect(plan.chains.map((chain) => chain.route)).toEqual([
        ["A1", "B1"],
        ["A1", "B3"],
        ["A2", "B2"],
      ]);
      expect(plan.productsToPull).toEqual([]);
    });

    it("names an extra copy as the dead end of the chain that fills its location", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION], A2: [NEW_VERSION], C1: [OTHER_CARD] },
        { A2: OTHER_CARD, B3: NEW_VERSION }
      );

      expect(plan.chains.map((chain) => [chain.route, chain.deadEndPulls])).toEqual([
        [["A1", "B3"], []],
        [["C1", "A2"], [{ location: "A2", product: NEW_VERSION }]],
      ]);
    });

    it("pulls an extra copy left over beside a swap", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION], A2: [NEW_VERSION], B3: [OTHER_CARD] },
        { A1: OTHER_CARD, B3: NEW_VERSION }
      );

      expect(plan.chains.map((chain) => [chain.route, chain.isCircular])).toEqual([
        [["A1", "B3", "A1"], true],
      ]);
      expect(plan.productsToPull).toEqual([{ location: "A2", product: NEW_VERSION }]);
    });
  });

  describe("products to pull", () => {
    it("lists a location's products that have no place in the new layout", () => {
      const plan = buildMovePlan({ A1: [OLD_VERSION, NEW_VERSION] }, { B3: NEW_VERSION });

      expect(plan.productsToPull).toEqual([{ location: "A1", product: OLD_VERSION }]);
    });

    it("lists an older version left behind when the new version stays put", () => {
      const plan = buildMovePlan({ A1: [OLD_VERSION, NEW_VERSION] }, { A1: NEW_VERSION });

      expect(plan).toEqual({
        chains: [],
        productsToPull: [{ location: "A1", product: OLD_VERSION }],
      });
    });

    it("lists products in the natural order of their locations", () => {
      const plan = buildMovePlan({ A10: [OLD_VERSION], A2: [REMOVED_CARD] }, {});

      expect(plan.productsToPull).toEqual([
        { location: "A2", product: REMOVED_CARD },
        { location: "A10", product: OLD_VERSION },
      ]);
    });
  });

  describe("dead ends", () => {
    it("names the product to pull from the chain's last location", () => {
      const plan = buildMovePlan({ A1: [NEW_VERSION], B3: [REMOVED_CARD] }, { B3: NEW_VERSION });

      expect(plan).toEqual({
        chains: [
          {
            route: ["A1", "B3"],
            steps: [A1_TO_B3],
            isCircular: false,
            deadEndPulls: [{ location: "B3", product: REMOVED_CARD }],
          },
        ],
        productsToPull: [{ location: "B3", product: REMOVED_CARD }],
      });
    });

    it("names nothing when the chain ends at an empty location", () => {
      const plan = buildMovePlan({ A1: [NEW_VERSION] }, { B3: NEW_VERSION });

      expect(plan.chains[0].deadEndPulls).toEqual([]);
    });

    it("names nothing for a circular chain", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION, REMOVED_CARD], B3: [OTHER_CARD] },
        { A1: OTHER_CARD, B3: NEW_VERSION }
      );

      expect(plan.chains[0].isCircular).toBe(true);
      expect(plan.chains[0].deadEndPulls).toEqual([]);
    });
  });

  describe("plans with nothing to do", () => {
    it("is empty for an update that only adds new products", () => {
      const plan = buildMovePlan({ A1: [OTHER_CARD] }, { A1: OTHER_CARD, B3: NEW_VERSION });

      expect(plan).toEqual({ chains: [], productsToPull: [] });
    });

    it("is empty for identical layouts", () => {
      const plan = buildMovePlan(
        { A1: [NEW_VERSION], B3: [OTHER_CARD] },
        { A1: NEW_VERSION, B3: OTHER_CARD }
      );

      expect(plan).toEqual({ chains: [], productsToPull: [] });
    });
  });
});
