import { Injectable } from "@nestjs/common";
import { categoryLinks } from "../common/links";
import { DatabaseService } from "../database/database.service";
import { pagination, pageResult } from "../common/pagination.dto";
import {
  CategoriesQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from "./categories.dto";

function categoryView<T extends { id: number }>(category: T) {
  return { ...category, _links: categoryLinks(category.id) };
}

@Injectable()
export class CategoriesService {
  constructor(private readonly db: DatabaseService) {}

  async list(query: CategoriesQueryDto) {
    const where = query.search
      ? { name: { contains: query.search, mode: "insensitive" as const } }
      : {};
    const [items, total] = await this.db.$transaction([
      this.db.category.findMany({
        where,
        ...pagination(query),
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      this.db.category.count({ where }),
    ]);
    return pageResult(items.map(categoryView), total, query, "/categories");
  }

  async get(id: number) {
    return categoryView(
      await this.db.category.findUniqueOrThrow({ where: { id } }),
    );
  }
  async create(data: CreateCategoryDto) {
    return categoryView(await this.db.category.create({ data }));
  }
  async update(id: number, data: UpdateCategoryDto) {
    return categoryView(await this.db.category.update({ where: { id }, data }));
  }
  async delete(id: number) {
    await this.db.category.delete({ where: { id } });
  }
}
