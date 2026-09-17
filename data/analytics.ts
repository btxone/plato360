export const overview = {
  menuOpens: 2846,
  avgAttentionSeconds: 5.4,
  topAttentionDish: "Smash Trufa",
  topAttentionValue: "7,1 s promedio",
  topAddedDish: "Pizza Burrata",
  topAddedValue: "16% lo agregó",
  topRevisitedDish: "Cheesecake Pistacho",
  topRevisitedValue: "31% volvió a verlo",
};

export const dishAnalytics = [
  { slug: "smash-trufa", avgAttention: 7.1, openedDetailPct: 24, addedPct: 14, revisitedPct: 29, interestScore: 8.7, label: "Muy alto interés" },
  { slug: "cheesecake-pistacho", avgAttention: 6.9, openedDetailPct: 19, addedPct: 11, revisitedPct: 31, interestScore: 8.4, label: "Muy alto interés" },
  { slug: "pizza-burrata", avgAttention: 6.2, openedDetailPct: 22, addedPct: 16, revisitedPct: 22, interestScore: 8.1, label: "Alto interés" },
  { slug: "ravioles-calabaza", avgAttention: 5.3, openedDetailPct: 20, addedPct: 8, revisitedPct: 17, interestScore: 7.2, label: "Alto interés" },
  { slug: "milanesa-brasa", avgAttention: 4.7, openedDetailPct: 15, addedPct: 10, revisitedPct: 14, interestScore: 6.4, label: "Interés medio" },
  { slug: "tacos-crispy", avgAttention: 3.8, openedDetailPct: 11, addedPct: 6, revisitedPct: 9, interestScore: 5.5, label: "Interés medio" },
  { slug: "limonada-brasa", avgAttention: 2.9, openedDetailPct: 8, addedPct: 13, revisitedPct: 6, interestScore: 5.1, label: "Interés medio" },
];

export const insights = [
  {
    title: "La Smash Trufa está funcionando muy bien",
    body: "Es uno de los platos que más tiempo miran y también uno de los que más agregan al pedido.",
    tone: "positive",
  },
  {
    title: "Los Ravioles generan curiosidad, pero convierten menos",
    body: "Las personas se quedan mirando, pero proporcionalmente pocas los agregan. Podría valer la pena revisar precio, descripción o presentación.",
    tone: "warm",
  },
  {
    title: "La limonada se decide rápido",
    body: "No necesita mucho tiempo de atención para terminar en el pedido.",
    tone: "fresh",
  },
];
