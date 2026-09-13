import { Module } from "@nestjs/common";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";
import { CategoryReviewsController } from "./category-reviews.controller";

@Module({
  controllers: [ReviewsController, CategoryReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
