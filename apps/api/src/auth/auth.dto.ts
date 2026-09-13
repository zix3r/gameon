import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsString, Length, MaxLength } from "class-validator";
import { Role } from "@prisma/client";
import { Trim } from "../common/input";
import { ResourceLinksView } from "../common/links";

export class LoginDto {
  @ApiProperty({ example: "demo@gameon.test", maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: "Demo1234", minLength: 1, maxLength: 128 })
  @IsString()
  @Length(1, 128)
  password!: string;
}

export class RegisterDto extends LoginDto {
  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  declare password: string;

  @ApiProperty({ example: "Player", minLength: 1, maxLength: 100 })
  @Trim()
  @IsString()
  @Length(1, 100)
  displayName!: string;
}

export class UserView {
  @ApiProperty({ type: ResourceLinksView }) _links!: ResourceLinksView;
  @ApiProperty({ type: "integer", minimum: 1 }) id!: number;
  @ApiProperty({ format: "email" }) email!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ enum: Role }) role!: Role;
}

export class AuthView {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ example: 900 }) expiresIn!: number;
  @ApiProperty({ enum: ["Bearer"] }) tokenType!: string;
  @ApiProperty({ type: UserView }) user!: UserView;
}

export interface CurrentIdentity extends Omit<UserView, "_links"> {
  sessionId: number;
}
