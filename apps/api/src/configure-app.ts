import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { PrismaExceptionFilter } from "./common/prisma.filter";
import { type Request, type Response, type NextFunction } from "express";

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix("api");
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.path.startsWith("/api/auth/"))
      response.setHeader("Cache-Control", "no-store");
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  const specification = new DocumentBuilder()
    .setTitle("GameON API")
    .setVersion("1.0")
    .setDescription(
      "GameON REST API. Use Bearer access tokens for protected routes. Cookie-changing auth requests require X-GameON-CSRF: 1. Access tokens last 15 minutes; refresh sessions last up to 30 days.",
    )
    .addBearerAuth()
    .addCookieAuth(
      "gameon_refresh",
      { type: "apiKey", in: "cookie" },
      "refresh",
    )
    .build();
  const document = SwaggerModule.createDocument(app, specification);
  SwaggerModule.setup("api/docs", app, document);
  return document;
}
