import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../common/pagination.dto";

export class CreateOrderDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  gameId!: string;
}

export class OrdersQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    format: "uuid",
    description:
      "Administrators may filter by any user; regular users may only specify their own ID",
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
