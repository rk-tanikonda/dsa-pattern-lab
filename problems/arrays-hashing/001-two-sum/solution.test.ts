import { describe, expect, it } from "vitest";
import { twoSum } from "./solution";

describe("Two Sum", () => {
  it("finds the indices of two numbers", () => {
    expect(twoSum([3, 2, 4], 6)).toEqual([1, 2]);
  });
});
