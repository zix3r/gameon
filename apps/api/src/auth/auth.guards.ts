import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { type Role } from "@prisma/client";
import { type Request } from "express";
import { AuthService } from "./auth.service";
import { AUTH_SETTINGS, type AuthSettings } from "./auth.config";
import {
  PUBLIC_ROUTE,
  REQUIRED_ROLES,
  type AuthRequest,
} from "./auth.decorators";

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const header = request.headers.authorization;
    if (!header || header.length > 4096 || !/^Bearer \S+$/.test(header))
      throw new UnauthorizedException("Bearer access token required");
    request.identity = await this.auth.authenticate(header.slice(7));
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[]>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) return true;
    const { identity } = context.switchToHttp().getRequest<AuthRequest>();
    if (!identity || !roles.includes(identity.role))
      throw new ForbiddenException("Insufficient permissions");
    return true;
  }
}

@Injectable()
export class CookieOriginGuard implements CanActivate {
  constructor(@Inject(AUTH_SETTINGS) private readonly settings: AuthSettings) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (
      request.headers["x-gameon-csrf"] !== "1" ||
      request.headers["sec-fetch-site"] === "cross-site" ||
      (request.headers.origin &&
        request.headers.origin !== this.settings.origin)
    ) {
      throw new ForbiddenException(
        "Invalid request origin or missing X-GameON-CSRF header",
      );
    }
    return true;
  }
}
