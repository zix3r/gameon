import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma, Role } from "@prisma/client";
import { link } from "../common/links";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { isUUID } from "class-validator";
import { DatabaseService } from "../database/database.service";
import {
  ACCESS_SECONDS,
  AUTH_SETTINGS,
  REFRESH_MS,
  type AuthSettings,
} from "./auth.config";
import {
  type CurrentIdentity,
  type LoginDto,
  type RegisterDto,
  type UserView,
} from "./auth.dto";
import { dummyPasswordHash, hashPassword, verifyPassword } from "./password";

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
} as const;
interface AccessClaims {
  sub: string;
  role: Role;
  sid: string;
  exp: number;
  iat: number;
}
export function refreshHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    @Inject(AUTH_SETTINGS) private readonly settings: AuthSettings,
  ) {}

  private async tokenResponse(
    user: Omit<UserView, "_links">,
    sessionId: string,
    refreshToken: string,
    expiresAt: Date,
  ) {
    const accessToken = await this.jwt.signAsync(
      { role: user.role, sid: sessionId },
      {
        secret: this.settings.secret,
        algorithm: "HS256",
        subject: user.id,
        issuer: "gameon",
        audience: "gameon-web",
        expiresIn: ACCESS_SECONDS,
      },
    );
    return {
      body: {
        accessToken,
        expiresIn: ACCESS_SECONDS,
        tokenType: "Bearer",
        user: { ...user, _links: { self: link("/auth/me") } },
      },
      refreshToken,
      expiresAt,
    };
  }

  private async createSession(
    tx: Prisma.TransactionClient,
    user: Omit<UserView, "_links">,
  ) {
    const refreshToken = randomBytes(32).toString("base64url");
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_MS);
    await tx.refreshSession.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: refreshHash(refreshToken),
        expiresAt,
      },
    });
    return this.tokenResponse(user, familyId, refreshToken, expiresAt);
  }

  async register(dto: RegisterDto) {
    const passwordHash = await hashPassword(dto.password);
    return this.db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          displayName: dto.displayName,
          passwordHash,
          role: Role.USER,
        },
        select: userSelect,
      });
      return this.createSession(tx, user);
    });
  }

  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({ where: { email: dto.email } });
    const valid = await verifyPassword(
      dto.password,
      user?.passwordHash ?? dummyPasswordHash,
    );
    if (!user || !valid)
      throw new UnauthorizedException("Invalid email or password");
    return this.db.$transaction((tx) =>
      this.createSession(tx, {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      }),
    );
  }

  async refresh(token: string | undefined) {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new UnauthorizedException("Invalid refresh token");
    const replacement = randomBytes(32).toString("base64url");
    const result = await this.db.$transaction(async (tx) => {
      const session = await tx.refreshSession.findUnique({
        where: { tokenHash: refreshHash(token) },
        include: { user: { select: userSelect } },
      });
      const now = new Date();
      if (!session || session.revokedAt || session.expiresAt <= now)
        return null;
      const consumed = session.usedAt
        ? { count: 0 }
        : await tx.refreshSession.updateMany({
            where: {
              id: session.id,
              usedAt: null,
              revokedAt: null,
              expiresAt: { gt: now },
            },
            data: { usedAt: now },
          });
      if (consumed.count !== 1) {
        await tx.refreshSession.updateMany({
          where: { familyId: session.familyId },
          data: { revokedAt: now },
        });
        return null;
      }
      await tx.refreshSession.create({
        data: {
          userId: session.userId,
          familyId: session.familyId,
          tokenHash: refreshHash(replacement),
          expiresAt: session.expiresAt,
        },
      });
      return {
        user: session.user,
        familyId: session.familyId,
        expiresAt: session.expiresAt,
      };
    });
    if (!result) throw new UnauthorizedException("Invalid refresh token");
    return this.tokenResponse(
      result.user,
      result.familyId,
      replacement,
      result.expiresAt,
    );
  }

  async logout(token: string | undefined) {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
    const session = await this.db.refreshSession.findUnique({
      where: { tokenHash: refreshHash(token) },
      select: { familyId: true },
    });
    if (session)
      await this.db.refreshSession.updateMany({
        where: { familyId: session.familyId },
        data: { revokedAt: new Date() },
      });
  }

  async authenticate(token: string): Promise<CurrentIdentity> {
    let claims: AccessClaims;
    try {
      claims = await this.jwt.verifyAsync<AccessClaims>(token, {
        secret: this.settings.secret,
        algorithms: ["HS256"],
        issuer: "gameon",
        audience: "gameon-web",
        maxAge: ACCESS_SECONDS,
      });
      if (
        !isUUID(claims.sub) ||
        !isUUID(claims.sid) ||
        !Object.values(Role).includes(claims.role) ||
        !Number.isFinite(claims.exp) ||
        !Number.isFinite(claims.iat) ||
        claims.iat > Date.now() / 1000 + 5
      )
        throw new Error("Invalid claims");
    } catch {
      throw new UnauthorizedException("Invalid access token");
    }
    const session = await this.db.refreshSession.findFirst({
      where: {
        familyId: claims.sid,
        userId: claims.sub,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { role: claims.role },
      },
      select: { user: { select: userSelect } },
    });
    if (!session) throw new UnauthorizedException("Session expired or revoked");
    return { ...session.user, sessionId: claims.sid };
  }
}
