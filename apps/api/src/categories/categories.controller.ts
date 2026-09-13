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
import { CategoryView } from "../common/views";
import {
  CategoriesQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from "./categories.dto";
import { CategoriesService } from "./categories.service";
import { AdminOnly, Public } from "../auth/auth.decorators";

@ApiTags("Categories")
@ApiBadRequestResponse({ description: "Invalid input" })
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List categories" })
  @ApiPage(CategoryView)
  list(@Query() query: CategoriesQueryDto) {
    return this.categories.list(query);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get a category" })
  @ApiOkResponse({ type: CategoryView })
  @ApiNotFoundResponse()
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.categories.get(id);
  }

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: "Create a category" })
  @ApiCreatedResponse({ type: CategoryView })
  @ApiConflictResponse({ description: "Category name already exists" })
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(":id")
  @AdminOnly()
  @ApiOperation({ summary: "Update a category" })
  @ApiOkResponse({ type: CategoryView })
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(NonEmptyBodyPipe) dto: UpdateCategoryDto,
  ) {
    return this.categories.update(id, dto);
  }

  @Delete(":id")
  @AdminOnly()
  @HttpCode(204)
  @ApiOperation({ summary: "Delete an empty category" })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: "Category still contains games" })
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.categories.delete(id);
  }
}
