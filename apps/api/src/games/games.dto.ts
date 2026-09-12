import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from "class-validator";
import { Trim } from "../common/input";
import { PaginationDto } from "../common/pagination.dto";

export class CreateGameDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  categoryId!: string;

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

  @ApiProperty({
    example: "19.99",
    description:
      "Nonnegative EUR decimal string, at most 8 integer digits and 2 decimal places",
  })
  @IsString()
  @Matches(/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/)
  price!: string;

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
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 200)
  search?: string;
}
