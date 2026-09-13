import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";
import { Trim } from "../common/input";
import { PaginationDto } from "../common/pagination.dto";

export class ReviewsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ type: "integer", minimum: 1, maximum: 2147483647 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  authorId?: number;
}

export class CreateReviewDto {
  @ApiProperty({ maxLength: 5000 })
  @Trim()
  @IsString()
  @Length(1, 5000)
  text!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
}

export class UpdateReviewDto extends PartialType(CreateReviewDto, {
  skipNullProperties: false,
}) {}
