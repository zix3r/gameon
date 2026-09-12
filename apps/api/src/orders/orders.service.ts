import { ForbiddenException, Injectable } from "@nestjs/common";
import { Role, type Order } from "@prisma/client";
import { type CurrentIdentity } from "../auth/auth.dto";
import { DatabaseService } from "../database/database.service";
import { pagination, pageResult } from "../common/pagination.dto";
import { CreateOrderDto, OrdersQueryDto } from "./orders.dto";

const game = { select: { id: true, title: true } } as const;
function orderView<T extends Order>(order: T) {
  return {
    ...order,
    unitPriceAtPurchase: order.unitPriceAtPurchase.toFixed(2),
  };
}

@Injectable()
export class OrdersService {
  constructor(private readonly db: DatabaseService) {}

  async create(data: CreateOrderDto, userId: string) {
    return this.db.$transaction(async (tx) => {
      const selected = await tx.game.findUniqueOrThrow({
        where: { id: data.gameId },
      });
      return orderView(
        await tx.order.create({
          data: {
            ...data,
            userId,
            unitPriceAtPurchase: selected.price,
            currency: "EUR",
          },
          include: { game },
        }),
      );
    });
  }

  async list(query: OrdersQueryDto, user: CurrentIdentity) {
    if (user.role !== Role.ADMIN && query.userId && query.userId !== user.id)
      throw new ForbiddenException("You may only list your own orders");
    const where = { userId: user.role === Role.ADMIN ? query.userId : user.id };
    const [items, total] = await this.db.$transaction([
      this.db.order.findMany({
        where,
        include: { game },
        ...pagination(query),
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
      this.db.order.count({ where }),
    ]);
    return pageResult(items.map(orderView), total, query);
  }

  async get(id: string, user: CurrentIdentity) {
    return orderView(
      await this.db.order.findUniqueOrThrow({
        where: { id, ...(user.role === Role.ADMIN ? {} : { userId: user.id }) },
        include: { game },
      }),
    );
  }
}
