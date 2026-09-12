import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import {
  PaginationDto,
  pagination,
  pageResult,
} from "../common/pagination.dto";
import { CreateCategoryDto, UpdateCategoryDto } from "./categories.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly db: DatabaseService) {}

  async list(query: PaginationDto) {
    const [items, total] = await this.db.$transaction([
      this.db.category.findMany({
        ...pagination(query),
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      this.db.category.count(),
    ]);
    return pageResult(items, total, query);
  }

  get(id: string) {
    return this.db.category.findUniqueOrThrow({ where: { id } });
  }
  create(data: CreateCategoryDto) {
    return this.db.category.create({ data });
  }
  update(id: string, data: UpdateCategoryDto) {
    return this.db.category.update({ where: { id }, data });
  }
  async delete(id: string) {
    await this.db.category.delete({ where: { id } });
  }
}
