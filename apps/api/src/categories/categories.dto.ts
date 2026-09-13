import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsOptional, IsString, Length } from "class-validator";
import { Trim } from "../common/input";
import { PaginationDto } from "../common/pagination.dto";

export class CategoriesQueryDto extends PaginationDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 100)
  search?: string;
}

export class CreateCategoryDto {
  @ApiProperty({ maxLength: 100, example: "Strategy" })
  @Trim()
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({
    maxLength: 2000,
    example: "Games focused on planning and tactical decisions.",
  })
  @Trim()
  @IsString()
  @Length(1, 2000)
  description!: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto, {
  skipNullProperties: false,
}) {}
