import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { type ArgumentsHost } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ApiExceptionFilter } from "../src/common/api-exception.filter";

for (const [code, expected] of Object.entries({
  P2000: 400,
  P2002: 409,
  P2003: 409,
  P2004: 400,
  P2011: 400,
  P2014: 409,
  P2020: 400,
  P2024: 503,
  P2025: 404,
  P2034: 409,
  P2037: 503,
  P1001: 503,
  P1017: 503,
})) {
  test(`database ${code} maps to ${expected} without leaking details`, () => {
    let status: number | undefined;
    let body: unknown;
    const response = {
      status(value: number) {
        status = value;
        return response;
      },
      json(value: unknown) {
        body = value;
      },
    };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as ArgumentsHost;
    new ApiExceptionFilter().catch(
      new Prisma.PrismaClientKnownRequestError("private SQL details", {
        code,
        clientVersion: Prisma.prismaVersion.client,
      }),
      host,
    );
    assert.equal(status, expected);
    assert.doesNotMatch(JSON.stringify(body), /private SQL details/);
  });
}
