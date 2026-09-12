import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiPropertyOptional,
  getSchemaPath,
} from "@nestjs/swagger";
import { applyDecorators, type Type as NestType } from "@nestjs/common";

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export function pagination(query: PaginationDto) {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

export function pageResult<T>(items: T[], total: number, query: PaginationDto) {
  return { items, page: query.page, pageSize: query.pageSize, total };
}

export function ApiPage(model: NestType<unknown>) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        type: "object",
        required: ["items", "page", "pageSize", "total"],
        properties: {
          items: { type: "array", items: { $ref: getSchemaPath(model) } },
          page: { type: "integer", minimum: 1 },
          pageSize: { type: "integer", minimum: 1, maximum: 100 },
          total: { type: "integer", minimum: 0 },
        },
      },
    }),
  );
}
