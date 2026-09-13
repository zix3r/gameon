import { ForbiddenException, Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import { link, reviewLinks } from "../common/links";
import { type CurrentIdentity } from "../auth/auth.dto";
import { DatabaseService } from "../database/database.service";
import { pagination, pageResult } from "../common/pagination.dto";
import {
  CreateReviewDto,
  ReviewsQueryDto,
  UpdateReviewDto,
} from "./reviews.dto";

const author = { select: { id: true, displayName: true } } as const;

function reviewView<T extends { id: string; gameId: string }>(review: T) {
  return { ...review, _links: reviewLinks(review.id, review.gameId) };
}

@Injectable()
export class ReviewsService {
  constructor(private readonly db: DatabaseService) {}

  async list(gameId: string, query: ReviewsQueryDto, categoryId?: string) {
    await this.db.game.findUniqueOrThrow({ where: { id: gameId, categoryId } });
    const [items, total] = await this.db.$transaction([
      this.db.review.findMany({
        where: { gameId, authorId: query.authorId },
        include: { author },
        ...pagination(query),
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
      this.db.review.count({ where: { gameId, authorId: query.authorId } }),
    ]);
    const path = categoryId
      ? `/categories/${categoryId}/games/${gameId}/reviews`
      : `/games/${gameId}/reviews`;
    return pageResult(items.map(reviewView), total, query, path, {
      game: link(`/games/${gameId}`),
      ...(categoryId ? { category: link(`/categories/${categoryId}`) } : {}),
    });
  }

  async get(gameId: string, id: string) {
    return reviewView(
      await this.db.review.findUniqueOrThrow({
        where: { id, gameId },
        include: { author },
      }),
    );
  }

  async create(gameId: string, data: CreateReviewDto, authorId: string) {
    await this.db.game.findUniqueOrThrow({ where: { id: gameId } });
    return reviewView(
      await this.db.review.create({
        data: { ...data, gameId, authorId },
        include: { author },
      }),
    );
  }

  async update(
    gameId: string,
    id: string,
    data: UpdateReviewDto,
    user: CurrentIdentity,
  ) {
    const review = await this.get(gameId, id);
    if (review.authorId !== user.id)
      throw new ForbiddenException("Only the author may edit a review");
    return reviewView(
      await this.db.review.update({
        where: { id, gameId, authorId: user.id },
        data,
        include: { author },
      }),
    );
  }

  async delete(gameId: string, id: string, user: CurrentIdentity) {
    const review = await this.get(gameId, id);
    if (review.authorId !== user.id && user.role !== Role.ADMIN)
      throw new ForbiddenException(
        "Only the author or an administrator may delete a review",
      );
    await this.db.review.delete({
      where: {
        id,
        gameId,
        ...(user.role === Role.ADMIN ? {} : { authorId: user.id }),
      },
    });
  }
}
