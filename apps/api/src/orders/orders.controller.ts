import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ApiPage } from "../common/pagination.dto";
import { OrderView } from "../common/views";
import { CreateOrderDto, OrdersQueryDto } from "./orders.dto";
import { OrdersService } from "./orders.service";
import { Authenticated, CurrentUser } from "../auth/auth.decorators";
import { type CurrentIdentity } from "../auth/auth.dto";

@ApiTags("Orders")
@Authenticated()
@ApiBadRequestResponse({ description: "Invalid input" })
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: "Place a demonstration order at the current game price",
  })
  @ApiCreatedResponse({ type: OrderView })
  @ApiNotFoundResponse({ description: "Game not found" })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: CurrentIdentity) {
    return this.orders.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: "List demonstration orders, optionally by user" })
  @ApiPage(OrderView)
  @ApiForbiddenResponse({
    description: "Only administrators may filter another user’s orders",
  })
  list(@Query() query: OrdersQueryDto, @CurrentUser() user: CurrentIdentity) {
    return this.orders.list(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a demonstration order" })
  @ApiOkResponse({ type: OrderView })
  @ApiNotFoundResponse()
  get(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentIdentity,
  ) {
    return this.orders.get(id, user);
  }
}
