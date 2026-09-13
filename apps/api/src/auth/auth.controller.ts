import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { parse } from "cookie";
import { type CookieOptions, type Request, type Response } from "express";
import {
  AUTH_SETTINGS,
  REFRESH_COOKIE,
  type AuthSettings,
} from "./auth.config";
import { Authenticated, CurrentUser, Public } from "./auth.decorators";
import {
  AuthView,
  LoginDto,
  RegisterDto,
  UserView,
  type CurrentIdentity,
} from "./auth.dto";
import { CookieOriginGuard } from "./auth.guards";
import { AuthService } from "./auth.service";
import { link } from "../common/links";

const csrfHeader = {
  name: "X-GameON-CSRF",
  required: true,
  schema: { type: "string", enum: ["1"] },
};

@ApiTags("Authentication")
@ApiBadRequestResponse({ description: "Invalid input" })
@ApiTooManyRequestsResponse({ description: "Too many requests; retry later" })
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(AUTH_SETTINGS) private readonly settings: AuthSettings,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.settings.secureCookies,
      sameSite: "strict",
      path: "/api/auth",
    };
  }

  private respond(
    response: Response,
    result: Awaited<ReturnType<AuthService["login"]>>,
  ) {
    response.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...this.cookieOptions(),
      expires: result.expiresAt,
      maxAge: Math.max(0, result.expiresAt.getTime() - Date.now()),
    });
    return result.body;
  }

  private refreshCookie(request: Request) {
    return parse(request.headers.cookie ?? "")[REFRESH_COOKIE];
  }

  @Public()
  @Post("register")
  @UseGuards(CookieOriginGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiHeader(csrfHeader)
  @ApiOperation({ summary: "Register a regular user and start a session" })
  @ApiCreatedResponse({ type: AuthView })
  @ApiConflictResponse({ description: "Email already registered" })
  @ApiForbiddenResponse()
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.respond(response, await this.auth.register(dto));
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  @UseGuards(CookieOriginGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiHeader(csrfHeader)
  @ApiOperation({
    summary: "Log in and receive an access token and refresh cookie",
  })
  @ApiOkResponse({ type: AuthView })
  @ApiUnauthorizedResponse({ description: "Invalid email or password" })
  @ApiForbiddenResponse()
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.respond(response, await this.auth.login(dto));
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  @UseGuards(CookieOriginGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiHeader(csrfHeader)
  @ApiCookieAuth("refresh")
  @ApiOperation({
    summary: "Rotate the refresh cookie and issue an access token",
  })
  @ApiOkResponse({ type: AuthView })
  @ApiUnauthorizedResponse({
    description: "Expired, revoked or reused refresh token",
  })
  @ApiForbiddenResponse()
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      return this.respond(
        response,
        await this.auth.refresh(this.refreshCookie(request)),
      );
    } catch (error) {
      if (error instanceof UnauthorizedException)
        response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  @Public()
  @Post("logout")
  @HttpCode(204)
  @UseGuards(CookieOriginGuard)
  @ApiHeader(csrfHeader)
  @ApiCookieAuth("refresh")
  @ApiOperation({ summary: "Revoke the current session and clear its cookie" })
  @ApiNoContentResponse()
  @ApiForbiddenResponse()
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(this.refreshCookie(request));
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Get("me")
  @Authenticated()
  @ApiOperation({ summary: "Get the authenticated user" })
  @ApiOkResponse({ type: UserView })
  me(@CurrentUser() user: CurrentIdentity): UserView {
    return {
      _links: { self: link("/auth/me") },
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }
}
