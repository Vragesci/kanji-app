import { describe, expect, it } from "vitest";
import { deteksiPlatform } from "./pasang";

describe("deteksi platform pemasangan", () => {
  it("mengenali iPhone, iPad lama, dan iPadOS yang menyamar sebagai Mac", () => {
    expect(deteksiPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", "iPhone", 5)).toBe("ios");
    expect(deteksiPlatform("Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X)", "iPad", 5)).toBe("ios");
    expect(deteksiPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5)).toBe("ios");
  });
  it("Mac sungguhan (tanpa layar sentuh) bukan iOS", () => {
    expect(deteksiPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 0)).toBe("lain");
  });
  it("mengenali Android", () => {
    expect(deteksiPlatform("Mozilla/5.0 (Linux; Android 13; SM-A536E) Chrome/120", "Linux armv81", 5)).toBe("android");
  });
});
