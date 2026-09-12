import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";
import { Trim } from "../common/input";
import { PaginationDto } from "../common/pagination.dto";

export class ReviewsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  authorId?: string;
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
