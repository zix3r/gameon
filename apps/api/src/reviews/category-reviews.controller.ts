import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "../auth/auth.decorators";
import { ApiPage } from "../common/pagination.dto";
import { ReviewView } from "../common/views";
import { ReviewsQueryDto } from "./reviews.dto";
import { ReviewsService } from "./reviews.service";

@ApiTags("Reviews")
@ApiBadRequestResponse({ description: "Invalid input" })
@ApiNotFoundResponse({
  description: "Game not found in the requested category",
})
@Controller("categories/:categoryId/games/:gameId/reviews")
export class CategoryReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List reviews scoped through a category and game" })
  @ApiPage(ReviewView)
  list(
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Param("gameId", ParseUUIDPipe) gameId: string,
    @Query() query: ReviewsQueryDto,
  ) {
    return this.reviews.list(gameId, query, categoryId);
  }
}
