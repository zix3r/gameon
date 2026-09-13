import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CategoryLinksView, GameLinksView, GameChildLinksView } from "./links";

export class RecordView {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "date-time" }) createdAt!: string;
}

export class EditableView extends RecordView {
  @ApiProperty({ format: "date-time" }) updatedAt!: string;
}

export class CategoryView extends EditableView {
  @ApiProperty({ type: CategoryLinksView }) _links!: CategoryLinksView;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
}

export class GameView extends EditableView {
  @ApiProperty({ type: GameLinksView }) _links!: GameLinksView;
  @ApiProperty({ format: "uuid" }) categoryId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ example: "19.99", description: "EUR decimal string" })
  price!: string;
  @ApiProperty() platform!: string;
  @ApiProperty({ type: Number, nullable: true, minimum: 1, maximum: 5 })
  averageRating!: number | null;
  @ApiProperty({ minimum: 0 }) reviewCount!: number;
  @ApiPropertyOptional({ type: String, nullable: true }) imageUrl!:
    string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) igdbId!: number | null;
}

export class AuthorView {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() displayName!: string;
}

export class ReviewView extends EditableView {
  @ApiProperty({ type: GameChildLinksView }) _links!: GameChildLinksView;
  @ApiProperty({ format: "uuid" }) gameId!: string;
  @ApiProperty({ format: "uuid" }) authorId!: string;
  @ApiProperty() text!: string;
  @ApiProperty({ minimum: 1, maximum: 5 }) rating!: number;
  @ApiProperty({ type: AuthorView }) author!: AuthorView;
}

export class OrderedGameView {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() title!: string;
}

export class OrderView extends RecordView {
  @ApiProperty({ type: GameChildLinksView }) _links!: GameChildLinksView;
  @ApiProperty({ format: "uuid" }) gameId!: string;
  @ApiProperty({ format: "uuid" }) userId!: string;
  @ApiProperty({ example: "19.99" }) unitPriceAtPurchase!: string;
  @ApiProperty({ enum: ["EUR"] }) currency!: string;
  @ApiProperty({ type: OrderedGameView }) game!: OrderedGameView;
}
