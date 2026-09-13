import { Injectable } from "@nestjs/common";
import { gameLinks, link } from "../common/links";
import { type Game, type Prisma } from "@prisma/client";
import { DatabaseService } from "../database/database.service";
import { pagination, pageResult } from "../common/pagination.dto";
import { CreateGameDto, GamesQueryDto, UpdateGameDto } from "./games.dto";

@Injectable()
export class GamesService {
  constructor(private readonly db: DatabaseService) {}

  private async views(games: Game[]) {
    const ratings = await this.db.review.groupBy({
      by: ["gameId"],
      where: { gameId: { in: games.map((game) => game.id) } },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const byGame = new Map(ratings.map((rating) => [rating.gameId, rating]));
    return games.map((game) => ({
      ...game,
      price: game.price.toFixed(2),
      averageRating: byGame.get(game.id)?._avg.rating ?? null,
      reviewCount: byGame.get(game.id)?._count._all ?? 0,
      _links: gameLinks(game.id, game.categoryId),
    }));
  }

  async list(query: GamesQueryDto) {
    const where: Prisma.GameWhereInput = {
      categoryId: query.categoryId,
      title: query.search
        ? { contains: query.search, mode: "insensitive" }
        : undefined,
    };
    const [items, total] = await this.db.$transaction([
      this.db.game.findMany({
        where,
        ...pagination(query),
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
      this.db.game.count({ where }),
    ]);
    return pageResult(
      await this.views(items),
      total,
      query,
      "/games",
      query.categoryId
        ? { category: link(`/categories/${query.categoryId}`) }
        : {},
    );
  }

  async get(id: string) {
    return (
      await this.views([
        await this.db.game.findUniqueOrThrow({ where: { id } }),
      ])
    )[0]!;
  }

  async create(data: CreateGameDto) {
    await this.db.category.findUniqueOrThrow({
      where: { id: data.categoryId },
    });
    return (await this.views([await this.db.game.create({ data })]))[0]!;
  }

  async update(id: string, data: UpdateGameDto) {
    if (data.categoryId)
      await this.db.category.findUniqueOrThrow({
        where: { id: data.categoryId },
      });
    return (
      await this.views([await this.db.game.update({ where: { id }, data })])
    )[0]!;
  }

  async delete(id: string) {
    await this.db.game.delete({ where: { id } });
  }
}
