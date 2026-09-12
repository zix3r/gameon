import { ArgumentsHost, Catch, type ExceptionFilter } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host
      .switchToHttp()
      .getResponse<{ status(code: number): { json(body: object): void } }>();
    const errors: Record<string, [number, string]> = {
      P2002: [409, "A record with these unique fields already exists"],
      P2003: [409, "Operation conflicts with related records"],
      P2004: [400, "Value violates a database constraint"],
      P2025: [404, "Resource not found"],
    };
    const [statusCode, message] = errors[error.code] ?? [
      500,
      "Internal server error",
    ];
    if (statusCode === 500) console.error(error);
    response.status(statusCode).json({ statusCode, message });
  }
}
