import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from "@nestjs/common";
import { Transform } from "class-transformer";

@Injectable()
export class UnicodeInputPipe implements PipeTransform {
  transform(value: unknown) {
    const pending = [{ value, depth: 0 }];
    while (pending.length) {
      const { value: current, depth } = pending.pop()!;
      if (depth > 20)
        throw new BadRequestException("Input nesting exceeds 20 levels");
      if (typeof current === "string") {
        if (current.includes("\u0000") || !current.isWellFormed())
          throw new BadRequestException(
            "Text must contain valid Unicode without null characters",
          );
      } else if (current && typeof current === "object") {
        for (const [key, field] of Object.entries(current))
          pending.push(
            { value: key, depth: depth + 1 },
            { value: field, depth: depth + 1 },
          );
      }
    }
    return value;
  }
}

export function Trim() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  );
}

@Injectable()
export class NonEmptyBodyPipe implements PipeTransform {
  transform(value: object) {
    if (!value || !Object.values(value).some((field) => field !== undefined)) {
      throw new BadRequestException("Provide at least one field to update");
    }
    return value;
  }
}
