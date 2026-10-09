import { describe, expect, it } from "vitest";
import { meansCurrentLocation } from "@/shared/here-words";

describe("'where I am now' phrases", () => {
  it.each(["aile basirako gharma", "mero ghar", "Mero gharma", "yahi", "yaha aaunus", "here", "my home", "current location", "अहिले बसिरहेको घरमा", "मेरो घर", "यहीँ"])(
    "%s means the current location",
    (text) => expect(meansCurrentLocation(text)).toBe(true),
  );

  it.each(["Balkot chowk", "Gharipatan", "Koteshwor", "बालकोट चोक", "there", "Thimi"])("%s is a place name", (text) =>
    expect(meansCurrentLocation(text)).toBe(false),
  );
});
