import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from "@nestjs/common";
import { Transform } from "class-transformer";

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
