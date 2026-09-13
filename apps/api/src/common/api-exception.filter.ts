import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger,
  type ExceptionFilter,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { type Response } from "express";

const databaseErrors: Record<string, [number, string]> = {
  P2000: [400, "Value is too long"],
  P2002: [409, "A record with these unique fields already exists"],
  P2003: [409, "Operation conflicts with related records"],
  P2004: [400, "Value violates a database constraint"],
  P2011: [400, "A required value is missing"],
  P2014: [409, "Operation conflicts with related records"],
  P2020: [400, "Value is out of range"],
  P2024: [503, "Database temporarily unavailable"],
  P2025: [404, "Resource not found"],
  P2034: [409, "Concurrent modification; retry the request"],
  P2037: [503, "Database temporarily unavailable"],
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    let statusCode = 500;
    let message: string | string[] = "Internal server error";
    if (error instanceof HttpException) {
      statusCode = error.getStatus();
      const body = error.getResponse();
      if (typeof body === "string") message = body;
      else if ("message" in body) {
        const detail: unknown = body.message;
        if (
          typeof detail === "string" ||
          (Array.isArray(detail) &&
            detail.every((item) => typeof item === "string"))
        )
          message = detail;
      }
    } else if (
      error instanceof Error &&
      "type" in error &&
      typeof error.type === "string" &&
      [
        "entity.too.large",
        "encoding.unsupported",
        "charset.unsupported",
        "entity.parse.failed",
        "request.aborted",
        "request.size.invalid",
      ].includes(error.type)
    ) {
      statusCode =
        error.type === "entity.too.large"
          ? 413
          : error.type.endsWith(".unsupported")
            ? 415
            : 400;
      message =
        statusCode === 413
          ? "Request body exceeds 100 KB"
          : statusCode === 415
            ? "Unsupported request encoding"
            : "Malformed request body";
    } else if (error instanceof Prisma.PrismaClientInitializationError) {
      statusCode = 503;
      message = "Database temporarily unavailable";
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      [statusCode, message] =
        databaseErrors[error.code] ??
        (/^P100[0128]$|^P101[17]$/.test(error.code)
          ? [503, "Database temporarily unavailable"]
          : [500, "Internal server error"]);
    }
    if (statusCode === 500) {
      message = "Internal server error";
      this.logger.error(error);
    }
    if (statusCode === 401) response.setHeader("WWW-Authenticate", "Bearer");
    response.status(statusCode).json({ statusCode, message });
  }
}
