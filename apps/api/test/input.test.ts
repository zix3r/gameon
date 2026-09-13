import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { UnicodeInputPipe } from "../src/common/input";

const pipe = new UnicodeInputPipe();

test("input rejects null characters and unpaired surrogates at every depth", () => {
  for (const text of ["\u0000", "a\u0000b", "\ud800", "\udfff", "a\ud800b"])
    for (const input of [
      text,
      { search: text },
      { nested: [text] },
      { [text]: "value" },
    ])
      assert.throws(() => pipe.transform(input), BadRequestException);
});

test("deep input is rejected before recursive DTO transformation", () => {
  let value: unknown = "nested";
  for (let depth = 0; depth < 10000; depth++) value = { value };
  assert.throws(() => pipe.transform(value), /Input nesting exceeds 20 levels/);
});

test("input preserves valid multilingual text and non-string values", () => {
  for (const input of [
    "Žaidimas 🎮",
    "日本語",
    "line\nnext\tcolumn",
    5,
    null,
    undefined,
    { rating: 5, text: "Puiku!" },
  ])
    assert.equal(pipe.transform(input), input);
});
