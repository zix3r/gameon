import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ParseIdPipe } from "../common/id.pipe";
import { ApiPage } from "../common/pagination.dto";
import { NonEmptyBodyPipe } from "../common/input";
import { ReviewView } from "../common/views";
import {
  CreateReviewDto,
  ReviewsQueryDto,
  UpdateReviewDto,
} from "./reviews.dto";
import { ReviewsService } from "./reviews.service";
import { Authenticated, CurrentUser, Public } from "../auth/auth.decorators";
import { type CurrentIdentity } from "../auth/auth.dto";

@ApiTags("Reviews")
@ApiBadRequestResponse({ description: "Invalid input" })
@ApiNotFoundResponse({ description: "Game or nested review not found" })
@Controller("games/:gameId/reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List reviews belonging to a game" })
  @ApiPage(ReviewView)
  list(
    @Param("gameId", ParseIdPipe) gameId: number,
    @Query() query: ReviewsQueryDto,
  ) {
    return this.reviews.list(gameId, query);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get a review belonging to a game" })
  @ApiOkResponse({ type: ReviewView })
  get(
    @Param("gameId", ParseIdPipe) gameId: number,
    @Param("id", ParseIdPipe) id: number,
  ) {
    return this.reviews.get(gameId, id);
  }

  @Post()
  @Authenticated()
  @ApiOperation({ summary: "Create a game review" })
  @ApiCreatedResponse({ type: ReviewView })
  @ApiConflictResponse({ description: "Author already reviewed this game" })
  create(
    @Param("gameId", ParseIdPipe) gameId: number,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: CurrentIdentity,
  ) {
    return this.reviews.create(gameId, dto, user.id);
  }

  @Patch(":id")
  @Authenticated()
  @ApiForbiddenResponse({ description: "Only the author may edit a review" })
  @ApiOperation({ summary: "Update review text or rating" })
  @ApiOkResponse({ type: ReviewView })
  update(
    @Param("gameId", ParseIdPipe) gameId: number,
    @Param("id", ParseIdPipe) id: number,
    @Body(NonEmptyBodyPipe) dto: UpdateReviewDto,
    @CurrentUser() user: CurrentIdentity,
  ) {
    return this.reviews.update(gameId, id, dto, user);
  }

  @Delete(":id")
  @Authenticated()
  @ApiForbiddenResponse({
    description: "Only the author or an administrator may delete a review",
  })
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a game review" })
  @ApiNoContentResponse()
  delete(
    @Param("gameId", ParseIdPipe) gameId: number,
    @Param("id", ParseIdPipe) id: number,
    @CurrentUser() user: CurrentIdentity,
  ) {
    return this.reviews.delete(gameId, id, user);
  }
}
