import { ForbiddenException, Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import { type CurrentIdentity } from "../auth/auth.dto";
import { DatabaseService } from "../database/database.service";
import { pagination, pageResult } from "../common/pagination.dto";
import {
  CreateReviewDto,
  ReviewsQueryDto,
  UpdateReviewDto,
} from "./reviews.dto";

const author = { select: { id: true, displayName: true } } as const;

@Injectable()
export class ReviewsService {
  constructor(private readonly db: DatabaseService) {}

  async list(gameId: string, query: ReviewsQueryDto) {
    await this.db.game.findUniqueOrThrow({ where: { id: gameId } });
    const [items, total] = await this.db.$transaction([
      this.db.review.findMany({
        where: { gameId, authorId: query.authorId },
        include: { author },
        ...pagination(query),
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
      this.db.review.count({ where: { gameId, authorId: query.authorId } }),
    ]);
    return pageResult(items, total, query);
  }

  get(gameId: string, id: string) {
    return this.db.review.findUniqueOrThrow({
      where: { id, gameId },
      include: { author },
    });
  }

  async create(gameId: string, data: CreateReviewDto, authorId: string) {
    await this.db.game.findUniqueOrThrow({ where: { id: gameId } });
    return this.db.review.create({
      data: { ...data, gameId, authorId },
      include: { author },
    });
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
    return this.db.review.update({
      where: { id, gameId, authorId: user.id },
      data,
      include: { author },
    });
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
