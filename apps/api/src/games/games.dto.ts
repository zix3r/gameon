import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsUrl,
  IsInt,
  Min,
  Max,
  Length,
  MaxLength,
} from "class-validator";
import { Trim } from "../common/input";
import { PaginationDto } from "../common/pagination.dto";

export class CreateGameDto {
  @ApiProperty({ type: "integer", minimum: 1, maximum: 2147483647 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  categoryId!: number;

  @ApiProperty({ maxLength: 200 })
  @Trim()
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty({ maxLength: 10000 })
  @Trim()
  @IsString()
  @Length(1, 10000)
  description!: string;

  @ApiProperty({ example: "PC", maxLength: 100 })
  @Trim()
  @IsString()
  @Length(1, 100)
  platform!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2048 })
  @IsOptional()
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  imageUrl?: string | null;
}

export class UpdateGameDto extends PartialType(CreateGameDto, {
  skipNullProperties: false,
}) {}

export class GamesQueryDto extends PaginationDto {
  @ApiPropertyOptional({ type: "integer", minimum: 1, maximum: 2147483647 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  categoryId?: number;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 200)
  search?: string;
}
