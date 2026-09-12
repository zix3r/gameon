import {
  applyDecorators,
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { type Request } from "express";
import { type CurrentIdentity } from "./auth.dto";

export const PUBLIC_ROUTE = "publicRoute";
export const REQUIRED_ROLES = "requiredRoles";
export type AuthRequest = Request & { identity: CurrentIdentity };
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentIdentity =>
    context.switchToHttp().getRequest<AuthRequest>().identity,
);

export function Authenticated() {
  return applyDecorators(
    SetMetadata(PUBLIC_ROUTE, false),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: "Missing, expired or revoked access token",
    }),
  );
}

export function AdminOnly() {
  return applyDecorators(
    SetMetadata(REQUIRED_ROLES, [Role.ADMIN]),
    Authenticated(),
    ApiForbiddenResponse({ description: "Administrator role required" }),
  );
}
