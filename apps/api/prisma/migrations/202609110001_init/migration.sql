CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Game" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(10000) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "platform" VARCHAR(100) NOT NULL,
    "imageUrl" VARCHAR(2048),
    "igdbId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Game_price_check" CHECK ("price" >= 0)
);

CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "text" VARCHAR(5000) NOT NULL,
    "rating" SMALLINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "unitPriceAtPurchase" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Order_price_check" CHECK ("unitPriceAtPurchase" >= 0),
    CONSTRAINT "Order_currency_check" CHECK ("currency" = 'EUR')
);

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

CREATE UNIQUE INDEX "Game_igdbId_key" ON "Game"("igdbId");

CREATE INDEX "Game_categoryId_createdAt_id_idx" ON "Game"("categoryId", "createdAt", "id");

CREATE INDEX "Game_createdAt_id_idx" ON "Game"("createdAt", "id");

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE INDEX "Review_gameId_createdAt_id_idx" ON "Review"("gameId", "createdAt", "id");

CREATE UNIQUE INDEX "Review_gameId_authorId_key" ON "Review"("gameId", "authorId");

CREATE INDEX "Order_userId_createdAt_id_idx" ON "Order"("userId", "createdAt", "id");

CREATE INDEX "Order_gameId_idx" ON "Order"("gameId");

CREATE INDEX "Order_createdAt_id_idx" ON "Order"("createdAt", "id");

ALTER TABLE "Game" ADD CONSTRAINT "Game_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review" ADD CONSTRAINT "Review_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
