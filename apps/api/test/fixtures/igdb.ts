import { catalogue } from "../../src/seed/catalogue";

export function igdbFixture() {
  return catalogue.map((game, index) => ({
    id: 900000 + index,
    slug: game.slug,
    name: game.slug
      .split("-")
      .map((word) => word[0]!.toUpperCase() + word.slice(1))
      .join(" "),
    summary: `Test metadata for ${game.slug}.`,
    cover: { image_id: `test_cover_${index}` },
    platforms: [{ name: "PC (Microsoft Windows)" }],
  }));
}

export const mockIgdb: typeof fetch = async (input) => {
  if (String(input) === "https://id.twitch.tv/oauth2/token")
    return Response.json({ access_token: "test-token" });
  if (String(input) === "https://api.igdb.com/v4/games")
    return Response.json(igdbFixture());
  throw new Error("Unexpected test URL");
};
