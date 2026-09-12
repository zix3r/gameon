export type Role = "USER" | "ADMIN";
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}
export interface AuthResult {
  accessToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  user: User;
}
export interface Category {
  id: string;
  name: string;
  description: string;
}
export interface Game {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  price: string;
  platform: string;
  imageUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
}
export interface Review {
  id: string;
  gameId: string;
  authorId: string;
  text: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
  author: { id: string; displayName: string };
}
export interface Order {
  id: string;
  gameId: string;
  userId: string;
  unitPriceAtPurchase: string;
  currency: string;
  createdAt: string;
  game: { id: string; title: string };
}
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
export interface GameInput {
  categoryId: string;
  title: string;
  description: string;
  price: string;
  platform: string;
  imageUrl: string | null;
}
