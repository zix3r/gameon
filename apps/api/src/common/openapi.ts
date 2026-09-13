import { type OpenAPIObject, type OperationObject } from "@nestjs/swagger";

export function documentErrors(document: OpenAPIObject) {
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas.ApiError = {
    type: "object",
    required: ["statusCode", "message"],
    properties: {
      statusCode: { type: "integer", example: 400 },
      message: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } },
        ],
        example: "Invalid input",
      },
    },
  };
  for (const path of Object.values(document.paths)) {
    for (const method of ["get", "post", "patch", "delete"] as const) {
      const operation = path[method] as OperationObject | undefined;
      if (!operation) continue;
      const shared: Record<string, string> = {
        "429": "Too many requests; retry after the Retry-After interval",
        "500": "Unexpected internal failure; details are not exposed",
        "503": "Database temporarily unavailable",
        ...(method === "post" || method === "patch"
          ? {
              "400": "Invalid input or malformed JSON",
              "413": "Request body exceeds 100 KB",
              "415": "Expected application/json with supported encoding",
            }
          : {}),
      };
      for (const [code, description] of Object.entries(shared))
        operation.responses[code] ??= { description };
      for (const [code, response] of Object.entries(operation.responses)) {
        if (!response || Number(code) < 400 || "$ref" in response) continue;
        response.description ||=
          {
            "400": "Invalid input",
            "401": "Authentication required or token invalid",
            "403": "Insufficient permissions or invalid request origin",
            "404": "Resource not found in the requested scope",
            "409": "Operation conflicts with existing records",
          }[code] ?? "Request failed";
        response.content = {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
            example: {
              statusCode: Number(code),
              message: response.description,
            },
          },
        };
        if (code === "401")
          response.headers = {
            "WWW-Authenticate": {
              schema: { type: "string", example: "Bearer" },
            },
          };
        if (code === "429")
          response.headers = {
            "Retry-After": {
              schema: { type: "integer", minimum: 1, example: 60 },
            },
          };
      }
    }
  }
}
