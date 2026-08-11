import { describe, expect, test } from "bun:test";
import { cn, isNumber, currency, budgetNumber, formatSignedPct, perfColor } from "./utils";

describe("utils", () => {
  describe("cn", () => {
    test("merges class names", () => {
      expect(cn("p-2", "m-2")).toBe("p-2 m-2");
    });
    test("handles conditional classes", () => {
      expect(cn("p-2", true && "text-red-500", false && "text-blue-500")).toBe("p-2 text-red-500");
    });
    test("merges tailwind classes properly", () => {
      expect(cn("p-2", "p-4")).toBe("p-4");
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });
  });

  describe("isNumber", () => {
    test("returns true for finite numbers", () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(42)).toBe(true);
      expect(isNumber(-3.14)).toBe(true);
    });
    test("returns false for non-finite numbers", () => {
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber(Infinity)).toBe(false);
      expect(isNumber(-Infinity)).toBe(false);
    });
    test("returns false for non-numbers", () => {
      expect(isNumber("42")).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber({})).toBe(false);
      expect(isNumber([])).toBe(false);
    });
  });

  describe("currency", () => {
    test("formats numbers as USD", () => {
      expect(currency.format(1234.56)).toBe("$1,234.56");
      expect(currency.format(0)).toBe("$0.00");
      expect(currency.format(-42)).toBe("-$42.00");
    });
  });

  describe("budgetNumber", () => {
    test("formats numbers properly", () => {
      expect(budgetNumber.format(1234.56)).toBe("1,234.56");
      expect(budgetNumber.format(1234)).toBe("1,234");
      expect(budgetNumber.format(0)).toBe("0");
    });
  });

  describe("formatSignedPct", () => {
    test("returns '--' for null or non-numbers", () => {
      expect(formatSignedPct(null)).toBe("--");
      // @ts-expect-error test non-number
      expect(formatSignedPct("12")).toBe("--");
    });
    test("formats positive numbers with + sign", () => {
      expect(formatSignedPct(5.123)).toBe("+5.12%");
      expect(formatSignedPct(0.01)).toBe("+0.01%");
    });
    test("formats negative numbers with - sign", () => {
      expect(formatSignedPct(-5.123)).toBe("-5.12%");
      expect(formatSignedPct(-0.01)).toBe("-0.01%");
    });
    test("formats zero without + sign", () => {
      expect(formatSignedPct(0)).toBe("0.00%");
    });
  });

  describe("perfColor", () => {
    test("returns default color for null or non-numbers", () => {
      expect(perfColor(null)).toBe("text-[#e4e4e7]");
      // @ts-expect-error test non-number
      expect(perfColor("12")).toBe("text-[#e4e4e7]");
    });
    test("returns green color for positive numbers and zero", () => {
      expect(perfColor(5.12)).toBe("text-[#4ade80]");
      expect(perfColor(0)).toBe("text-[#4ade80]");
    });
    test("returns red color for negative numbers", () => {
      expect(perfColor(-5.12)).toBe("text-[#f87171]");
    });
  });
});
