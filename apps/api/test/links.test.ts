import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  categoryLinks,
  gameLinks,
  link,
  reviewLinks,
} from "../src/common/links";
import { pageResult } from "../src/common/pagination.dto";

test("resource links point to implemented routes", () => {
  assert.equal(categoryLinks(1).games.href, "/api/games?categoryId=1");
  assert.equal(
    gameLinks(2, 1).reviews.href,
    "/api/categories/1/games/2/reviews",
  );
  assert.equal(reviewLinks(3, 2).self.href, "/api/games/2/reviews/3");
});

test("pagination retains encoded filters and omits unavailable directions", () => {
  const query = {
    page: 2,
    pageSize: 2,
    search: "Action & RPG?",
    categoryId: 1,
  };
  const result = pageResult([], 7, query, "/games");
  for (const [rel, page] of [
    ["self", 2],
    ["first", 1],
    ["last", 4],
    ["prev", 1],
    ["next", 3],
  ] as const) {
    const url = new URL(result._links[rel]!.href, "https://gameon.test");
    assert.equal(url.searchParams.get("search"), query.search);
    assert.equal(url.searchParams.get("categoryId"), "1");
    assert.equal(url.searchParams.get("pageSize"), "2");
    assert.equal(url.searchParams.get("page"), String(page));
  }
  assert.equal(
    pageResult([], 7, { page: 1, pageSize: 2 }, "/games")._links.prev,
    undefined,
  );
  assert.equal(
    pageResult([], 7, { page: 4, pageSize: 2 }, "/games")._links.next,
    undefined,
  );
});

test("empty and out-of-range pages provide a valid recovery link", () => {
  const empty = pageResult([], 0, { page: 1, pageSize: 10 }, "/categories");
  assert.equal(empty._links.first.href, empty._links.last.href);
  assert.equal(empty._links.next, undefined);
  assert.equal(empty._links.prev, undefined);
  const beyond = pageResult([], 12, { page: 999, pageSize: 10 }, "/games");
  assert.equal(beyond._links.prev?.href, beyond._links.last.href);
  assert.equal(beyond._links.next, undefined);
});

test("nested pagination retains parent scope and author filter", () => {
  const result = pageResult(
    [],
    3,
    { page: 1, pageSize: 1, ...{ authorId: 4 } },
    "/categories/1/games/2/reviews",
    { game: link("/games/2"), category: link("/categories/1") },
  );
  assert.match(
    result._links.next!.href,
    /^\/api\/categories\/1\/games\/2\/reviews\?/,
  );
  assert.match(result._links.next!.href, /authorId=4/);
  assert.equal(result._links.game?.href, "/api/games/2");
});
