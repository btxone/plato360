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

export const categories = [
  { label: "Recomendados", icon: "🔥" },
  { label: "Burgers", icon: "🍔" },
  { label: "Pizzas", icon: "🍕" },
  { label: "Pastas", icon: "🍝" },
  { label: "Principales", icon: "🥩" },
  { label: "Postres", icon: "🍰" },
  { label: "Bebidas", icon: "🥤" },
];

export const dishes: Dish[] = [
  {
    slug: "smash-trufa",
    name: "Smash Trufa",
    category: "Burgers",
    description: "Doble carne smash, cheddar, cebolla crocante y mayo de trufa.",
    price: 690,
    video: "/assets/videos/smash-trufa.mp4",
    image: "/assets/images/menu/smash-trufa.jpeg",
    poster: "/assets/images/posters/smash-trufa.png",
    emoji: "🍔",
    accent: "#cf6846",
    ingredients: ["Doble carne smash", "Cheddar", "Cebolla crocante", "Mayo de trufa"],
    tags: ["Favorito", "Intenso"],
  },
  {
    slug: "pizza-burrata",
    name: "Pizza Burrata",
    category: "Pizzas",
    description: "Pomodoro, mozzarella, burrata cremosa, albahaca y oliva.",
    price: 740,
    video: "/assets/videos/pizza-burrata.mp4",
    image: "/assets/images/menu/pizza-burrata.jpeg",
    poster: "/assets/images/menu/pizza-burrata.jpeg",
    emoji: "🍕",
    accent: "#be5d3d",
    ingredients: ["Pomodoro", "Mozzarella", "Burrata cremosa", "Albahaca fresca"],
    tags: ["Para compartir", "Vegetariano"],
  },
  {
    slug: "ravioles-calabaza",
    name: "Ravioles de Calabaza",
    category: "Pastas",
    description: "Ravioles artesanales, crema de parmesano y nueces tostadas.",
    price: 620,
    video: "/assets/videos/ravioles-calabaza.mp4",
    image: "/assets/images/menu/ravioles-calabaza.jpeg",
    poster: "/assets/images/menu/ravioles-calabaza.jpeg",
    emoji: "🍝",
    accent: "#bb7d44",
    ingredients: ["Ravioles de calabaza", "Crema de parmesano", "Nueces tostadas", "Salvia"],
    tags: ["Artesanal", "Vegetariano"],
  },
  {
    slug: "milanesa-brasa",
    name: "Milanesa Brasa",
    category: "Principales",
    description: "Milanesa crocante, provolone, tomate asado y papas rústicas.",
    price: 780,
    video: "/assets/videos/milanesa-brasa.mp4",
    image: "/assets/images/menu/milanesa-brasa.png",
    poster: "/assets/images/menu/milanesa-brasa.png",
    emoji: "🥩",
    accent: "#a8573f",
    ingredients: ["Milanesa crocante", "Provolone", "Tomate asado", "Papas rústicas"],
    tags: ["De la casa"],
  },
  {
    slug: "tacos-crispy",
    name: "Tacos Crispy",
    category: "Principales",
    description: "Pollo crispy, palta, repollo, salsa fresca y lima.",
    price: 590,
    video: "/assets/videos/tacos-crispy.mp4",
    image: "/assets/images/menu/tacos-crispy.jpeg",
    poster: "/assets/images/menu/tacos-crispy.jpeg",
    emoji: "🌮",
    accent: "#8c6c36",
    ingredients: ["Pollo crispy", "Palta", "Repollo morado", "Salsa fresca", "Lima"],
    tags: ["Fresco", "Para compartir"],
  },
  {
    slug: "cheesecake-pistacho",
    name: "Cheesecake Pistacho",
    category: "Postres",
    description: "Cheesecake cremoso, pistacho tostado y chocolate blanco.",
    price: 390,
    video: "/assets/videos/cheesecake-pistacho.mp4",
    image: "/assets/images/menu/cheesecake-pistacho.jpeg",
    poster: "/assets/images/menu/cheesecake-pistacho.jpeg",
    emoji: "🍰",
    accent: "#7f8960",
    ingredients: ["Cheesecake cremoso", "Pistacho tostado", "Chocolate blanco"],
    tags: ["Dulce final"],
  },
  {
    slug: "limonada-brasa",
    name: "Limonada Brasa",
    category: "Bebidas",
    description: "Limón, menta, jengibre y hielo.",
    price: 210,
    video: "/assets/videos/limonada-brasa.mp4",
    image: "/assets/images/menu/limonada-brasa.jpeg",
    poster: "/assets/images/menu/limonada-brasa.jpeg",
    emoji: "🍋",
    accent: "#7f9854",
    ingredients: ["Limón", "Menta", "Jengibre", "Hielo"],
    tags: ["Refrescante"],
  },
];

export const getDish = (slug: string) => dishes.find((dish) => dish.slug === slug);
