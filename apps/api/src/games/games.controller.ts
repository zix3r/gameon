import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ApiPage } from "../common/pagination.dto";
import { NonEmptyBodyPipe } from "../common/input";
import { GameView } from "../common/views";
import { CreateGameDto, GamesQueryDto, UpdateGameDto } from "./games.dto";
import { GamesService } from "./games.service";
import { AdminOnly, Public } from "../auth/auth.decorators";

@ApiTags("Games")
@ApiBadRequestResponse({ description: "Invalid input" })
@Controller("games")
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List, search and filter games" })
  @ApiPage(GameView)
  list(@Query() query: GamesQueryDto) {
    return this.games.list(query);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get a game" })
  @ApiOkResponse({ type: GameView })
  @ApiNotFoundResponse()
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.games.get(id);
  }

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: "Create a game" })
  @ApiCreatedResponse({ type: GameView })
  @ApiNotFoundResponse({ description: "Category not found" })
  @ApiConflictResponse({
    description: "Category changed during the request; retry",
  })
  create(@Body() dto: CreateGameDto) {
    return this.games.create(dto);
  }

  @Patch(":id")
  @AdminOnly()
  @ApiOperation({ summary: "Update a game" })
  @ApiOkResponse({ type: GameView })
  @ApiNotFoundResponse()
  @ApiConflictResponse({
    description: "Category changed during the request; retry",
  })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(NonEmptyBodyPipe) dto: UpdateGameDto,
  ) {
    return this.games.update(id, dto);
  }

  @Delete(":id")
  @AdminOnly()
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a game without reviews" })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: "Game still has reviews" })
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.games.delete(id);
  }
}
