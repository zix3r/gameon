import {
  Controller,
  Get,
  Inject,
  Module,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DatabaseService } from "./database/database.service";
import { DatabaseModule } from "./database/database.module";
import { CategoriesModule } from "./categories/categories.module";
import { GamesModule } from "./games/games.module";
import { ReviewsModule } from "./reviews/reviews.module";
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
  @ApiOkResponse({
    schema: {
      type: "object",
      required: ["status"],
      properties: { status: { type: "string", enum: ["ok"] } },
      example: { status: "ok" },
    },
  })
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
