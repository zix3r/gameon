import {
  Controller,
  Get,
  Inject,
  Module,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DatabaseService } from "./database/database.service";
import { DatabaseModule } from "./database/database.module";
import { CategoriesModule } from "./categories/categories.module";
import { GamesModule } from "./games/games.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { OrdersModule } from "./orders/orders.module";
import { AuthModule } from "./auth/auth.module";
import { Public } from "./auth/auth.decorators";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "Check application and database readiness" })
  async health() {
    try {
      await this.database.$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException("Database unavailable");
    }
  }
}

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CategoriesModule,
    GamesModule,
    ReviewsModule,
    OrdersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
