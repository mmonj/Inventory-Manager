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

      expect(plan.chains).toHaveLength(1);
      expect(plan.chains[0].route).toEqual(["A1", "B3", "A1"]);
      expect(plan.chains[0].isCircular).toBe(true);
      expect(plan.chains[0].steps).toHaveLength(2);
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
