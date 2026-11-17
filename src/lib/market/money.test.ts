import { describe, expect, it } from "vitest";
import { countdown, formatBaht, payable, sumSatang } from "./money";

describe("money", () => {
  it("formatBaht", () => {
    expect(formatBaht(89000)).toBe("฿890");
    expect(formatBaht(129000)).toBe("฿1,290");
    expect(formatBaht(89050)).toBe("฿890.50");
    expect(formatBaht(0)).toBe("฿0");
  });
  it("sum / payable", () => {
    expect(sumSatang([{ price_satang: 89000 }, { price_satang: 39000 }])).toBe(128000);
    expect(payable(0)).toBe(true);
    expect(payable(1999)).toBe(false);
    expect(payable(2000)).toBe(true);
  });
  it("countdown", () => {
    expect(countdown(65_000)).toBe("01:05");
    expect(countdown(3_725_000)).toBe("1:02:05");
    expect(countdown(-5)).toBe("00:00");
  });
});
