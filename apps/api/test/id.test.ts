import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ParseIdPipe } from "../src/common/id.pipe";

const pipe = new ParseIdPipe();

test("IDs are positive 32-bit integers", () => {
  assert.equal(pipe.transform("1"), 1);
  assert.equal(pipe.transform("2147483647"), 2147483647);
});

test("malformed and out-of-range IDs are rejected before database access", () => {
  for (const value of [
    "0",
    "-1",
    "1.5",
    "1e2",
    "0x10",
    "01",
    "+1",
    " 1",
    "",
    "NaN",
    "2147483648",
    "9007199254740993",
    "9".repeat(400),
    "00000000-0000-4000-8000-000000000001",
  ])
    assert.throws(() => pipe.transform(value), BadRequestException);
});
