import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("handles tailwind conflicts", () => {
    expect(cn("px-2 py-2", "px-4")).toBe("py-2 px-4")
  })

  it("handles conditional classes", () => {
    expect(cn("foo", { bar: true, baz: false })).toBe("foo bar")
  })

  it("handles falsy values", () => {
    expect(cn("foo", null, undefined, false, 0)).toBe("foo")
  })

  it("handles nested arrays", () => {
    expect(cn("foo", ["bar", ["baz"]])).toBe("foo bar baz")
  })
})
