import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LinkView {
  @ApiProperty({ type: String }) href!: string;
}

export class ResourceLinksView {
  @ApiProperty({ type: LinkView }) self!: LinkView;
}

export class CategoryLinksView extends ResourceLinksView {
  @ApiProperty({ type: LinkView }) games!: LinkView;
}

export class GameLinksView extends ResourceLinksView {
  @ApiProperty({ type: LinkView }) category!: LinkView;
  @ApiProperty({ type: LinkView }) reviews!: LinkView;
}

export class GameChildLinksView extends ResourceLinksView {
  @ApiProperty({ type: LinkView }) game!: LinkView;
}

export class PageLinksView extends ResourceLinksView {
  @ApiProperty({ type: LinkView }) first!: LinkView;
  @ApiProperty({ type: LinkView }) last!: LinkView;
  @ApiPropertyOptional({ type: LinkView }) next?: LinkView;
  @ApiPropertyOptional({ type: LinkView }) prev?: LinkView;
  @ApiPropertyOptional({ type: LinkView }) game?: LinkView;
  @ApiPropertyOptional({ type: LinkView }) category?: LinkView;
}

export function link(path: string, query: object = {}): LinkView {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  return { href: `/api${path}${params.size ? `?${params}` : ""}` };
}

export function categoryLinks(id: string): CategoryLinksView {
  return {
    self: link(`/categories/${id}`),
    games: link("/games", { categoryId: id }),
  };
}

export function gameLinks(id: string, categoryId: string): GameLinksView {
  return {
    self: link(`/games/${id}`),
    category: link(`/categories/${categoryId}`),
    reviews: link(`/categories/${categoryId}/games/${id}/reviews`),
  };
}

export function reviewLinks(id: string, gameId: string): GameChildLinksView {
  return {
    self: link(`/games/${gameId}/reviews/${id}`),
    game: link(`/games/${gameId}`),
  };
}
