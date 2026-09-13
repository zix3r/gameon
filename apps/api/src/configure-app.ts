import {
  UnsupportedMediaTypeException,
  ValidationPipe,
  type INestApplication,
} from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ApiExceptionFilter } from "./common/api-exception.filter";
import { UnicodeInputPipe } from "./common/input";
import { documentErrors } from "./common/openapi";
import { type Request, type Response, type NextFunction } from "express";

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix("api");
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.path.startsWith("/api/auth/"))
      response.setHeader("Cache-Control", "no-store");
    if (
      ["POST", "PATCH"].includes(request.method) &&
      (Number(request.headers["content-length"]) > 0 ||
        request.headers["transfer-encoding"]) &&
      !request.is("application/json")
    ) {
      next(new UnsupportedMediaTypeException("Expected application/json"));
      return;
    }
    next();
  });
  app.useGlobalPipes(
    new UnicodeInputPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
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
  documentErrors(document);
  SwaggerModule.setup("api/docs", app, document);
  return document;
}
