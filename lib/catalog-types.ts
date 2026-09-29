export type Dish = {
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number;
  video: string;
  image: string;
  poster: string;
  emoji: string;
  accent: string;
  ingredients: string[];
  tags?: string[];
};

export type Candidate = {
  slug: string;
  name: string;
  description: string;
  estimatedPrice: number;
  wouldOrderPct: number;
  votes: number;
  notifyCount: number;
  avgAttention: number;
  video: string;
  poster: string;
  emoji: string;
  accent: string;
  status: string;
  ingredients: string[];
};

export type CatalogCategory = { label: string; icon: string };
export type PublicLocation = { name: string; tagline: string | null; address: string | null; phone: string | null; logoUrl: string | null };
export type PublicFeatures = { visualMenu: boolean; traditionalMenu: boolean; orders: boolean; candidates: boolean; telemetry: boolean };
