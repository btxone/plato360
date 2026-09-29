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

export const candidates: Candidate[] = [
  {
    slug: "burger-bbq-ahumada",
    name: "Burger BBQ Ahumada",
    description: "Carne a la brasa, cheddar, cebolla dulce y BBQ ahumada.",
    estimatedPrice: 760,
    wouldOrderPct: 72,
    votes: 438,
    notifyCount: 186,
    avgAttention: 7.2,
    video: "/assets/videos/tu-decides-burger-bbq.mp4",
    poster: "/assets/images/posters/tu-decides-burger-bbq.jpeg",
    emoji: "🍔",
    accent: "#cb6848",
    status: "Mejor candidato",
    ingredients: ["Carne a la brasa", "Cheddar", "Cebolla dulce", "BBQ ahumada"],
  },
  {
    slug: "taco-fuego",
    name: "Taco Fuego",
    description: "Carne braseada, crema de palta, chile dulce y lima.",
    estimatedPrice: 640,
    wouldOrderPct: 61,
    votes: 354,
    notifyCount: 121,
    avgAttention: 6.3,
    video: "/assets/videos/tu-decides-taco-fuego.mp4",
    poster: "/assets/images/posters/tu-decides-taco-fuego.jpeg",
    emoji: "🌮",
    accent: "#b3623e",
    status: "Buen interés",
    ingredients: ["Carne braseada", "Crema de palta", "Chile dulce", "Lima"],
  },
  {
    slug: "gnocchi-crocante",
    name: "Gnocchi Crocante",
    description: "Gnocchi dorados, crema de hongos, parmesano y tomillo.",
    estimatedPrice: 680,
    wouldOrderPct: 39,
    votes: 201,
    notifyCount: 67,
    avgAttention: 4.6,
    video: "/assets/videos/tu-decides-gnocchi.mp4",
    poster: "/assets/images/posters/tu-decides-gnocchi.jpeg",
    emoji: "🍝",
    accent: "#92714c",
    status: "Necesita más validación",
    ingredients: ["Gnocchi dorados", "Crema de hongos", "Parmesano", "Tomillo"],
  },
];

export const getCandidate = (slug: string) => candidates.find((candidate) => candidate.slug === slug);
