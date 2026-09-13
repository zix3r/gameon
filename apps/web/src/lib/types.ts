export interface Link {
  href: string;
}
export interface ResourceLinks {
  self: Link;
}
export interface PageLinks extends ResourceLinks {
  first: Link;
  last: Link;
  next?: Link;
  prev?: Link;
  game?: Link;
  category?: Link;
}
export type Role = "USER" | "ADMIN";
export interface User {
  _links: ResourceLinks;
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
  _links: ResourceLinks & { games: Link };
  id: string;
  name: string;
  description: string;
}
export interface Game {
  _links: ResourceLinks & { category: Link; reviews: Link };
  id: string;
  categoryId: string;
  title: string;
  description: string;
  platform: string;
  imageUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
}
export interface Review {
  _links: ResourceLinks & { game: Link };
  id: string;
  gameId: string;
  authorId: string;
  text: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
  author: { id: string; displayName: string };
}
export interface Page<T> {
  _links: PageLinks;
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
export interface GameInput {
  categoryId: string;
  title: string;
  description: string;
  platform: string;
  imageUrl: string | null;
}
