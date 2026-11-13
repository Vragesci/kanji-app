import { describe, expect, it } from "vitest";
import { adaSuaraJepang, teksUcap } from "./suara";

describe("teksUcap", () => {
  it("membiarkan kana biasa", () => expect(teksUcap("せんせい")).toBe("せんせい"));
  it("membuang tanda imbuhan", () => expect(teksUcap("～にん")).toBe("にん"));
  it("membuka kurung akhiran", () => expect(teksUcap("たいせつ（な）")).toBe("たいせつな"));
});

describe("adaSuaraJepang", () => {
  it("false di lingkungan tanpa mesin suara", () => expect(adaSuaraJepang()).toBe(false));
});
