export type SingleNavItem = { title: string; href: string; outlined?: boolean };

export type NavItems = SingleNavItem[];

export type SingleArticle = {
  slug: string;
  content: string;
  meta: {
    title: string;
    description: string;
    date: string;
    tags: string;
    imageUrl: string;
    category?: string;
    views?: number;
  };
};

export type SingleVideo = {
  slug: string;
  content: string;
  meta: {
    title: string;
    description: string;
    videoUrl: string;
    thumbnailUrl: string;
    category: string;
    tags: string;
    views: number;
  };
};

export type NonNullableChildren<T> = { [P in keyof T]: Required<NonNullable<T[P]>> };

export type NonNullableChildrenDeep<T> = {
  [P in keyof T]-?: NonNullableChildrenDeep<NonNullable<T[P]>>;
};
