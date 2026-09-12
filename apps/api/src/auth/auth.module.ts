import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AUTH_SETTINGS, readAuthConfig } from "./auth.config";
import { AuthController } from "./auth.controller";
import { AccessGuard, CookieOriginGuard, RolesGuard } from "./auth.guards";
import { AuthService } from "./auth.service";

@Module({
  imports: [
    JwtModule.register({}),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 200 }]),
  ],
  controllers: [AuthController],
  providers: [
    { provide: AUTH_SETTINGS, useFactory: () => readAuthConfig() },
    AuthService,
    CookieOriginGuard,
    { provide: APP_GUARD, useClass: AccessGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
