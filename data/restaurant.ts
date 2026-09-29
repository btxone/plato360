export const restaurant = {
  name: "Casa Brasa",
  shortName: "CASA BRASA",
  tagline: "Cocina que entra por los ojos",
  location: "Montevideo",
  logo: "/assets/brand/casa-brasa.svg",
  whatsapp: "59800000000",
  whatsappMessage:
    "Hola, vi el menú visual y quiero ver cómo podría quedar para mi restaurante.",
};

export const theme = {
  accent: "#ef754f",
  accentSoft: "#ffb08c",
  ink: "#16120f",
  cream: "#f7f1e8",
};

export const whatsappUrl = `https://wa.me/${restaurant.whatsapp}?text=${encodeURIComponent(restaurant.whatsappMessage)}`;
