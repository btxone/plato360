CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  location TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  restaurant_id TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS dishes (
  id TEXT PRIMARY KEY NOT NULL,
  restaurant_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  video_url TEXT,
  image_url TEXT NOT NULL,
  poster_url TEXT,
  emoji TEXT NOT NULL,
  accent TEXT NOT NULL,
  ingredients_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  available INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY NOT NULL,
  restaurant_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_price INTEGER NOT NULL,
  would_order_pct INTEGER NOT NULL,
  seed_votes INTEGER NOT NULL DEFAULT 0,
  seed_notify_count INTEGER NOT NULL DEFAULT 0,
  avg_attention TEXT NOT NULL,
  video_url TEXT,
  poster_url TEXT,
  emoji TEXT NOT NULL,
  accent TEXT NOT NULL,
  status TEXT NOT NULL,
  ingredients_json TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  candidate_id TEXT NOT NULL,
  voter_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS votes_candidate_voter_unique ON votes (candidate_id, voter_token);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  candidate_id TEXT NOT NULL,
  email TEXT NOT NULL,
  consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_candidate_email_unique ON subscriptions (candidate_id, email);

CREATE TABLE IF NOT EXISTS video_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT,
  request_payload_json TEXT NOT NULL DEFAULT '{}',
  result_video_url TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO restaurants (id, name, short_name, tagline, location, logo_url)
VALUES ('casa-brasa', 'Casa Brasa', 'CASA BRASA', 'Cocina que entra por los ojos', 'Montevideo', '/assets/brand/casa-brasa.svg');

INSERT OR IGNORE INTO categories (id, restaurant_id, label, icon, sort_order)
VALUES
  ('recomendados', 'casa-brasa', 'Recomendados', '🔥', 0),
  ('burgers', 'casa-brasa', 'Burgers', '🍔', 1),
  ('pizzas', 'casa-brasa', 'Pizzas', '🍕', 2),
  ('pastas', 'casa-brasa', 'Pastas', '🍝', 3),
  ('principales', 'casa-brasa', 'Principales', '🥩', 4),
  ('postres', 'casa-brasa', 'Postres', '🍰', 5),
  ('bebidas', 'casa-brasa', 'Bebidas', '🥤', 6);

INSERT OR IGNORE INTO dishes (id, restaurant_id, category_id, slug, name, description, price, video_url, image_url, poster_url, emoji, accent, ingredients_json, tags_json, sort_order)
VALUES
  ('dish-smash-trufa', 'casa-brasa', 'burgers', 'smash-trufa', 'Smash Trufa', 'Doble carne smash, cheddar, cebolla crocante y mayo de trufa.', 690, '/assets/videos/smash-trufa.mp4', '/assets/images/menu/smash-trufa.jpeg', '/assets/images/posters/smash-trufa.png', '🍔', '#cf6846', '["Doble carne smash","Cheddar","Cebolla crocante","Mayo de trufa"]', '["Favorito","Intenso"]', 1),
  ('dish-pizza-burrata', 'casa-brasa', 'pizzas', 'pizza-burrata', 'Pizza Burrata', 'Pomodoro, mozzarella, burrata cremosa, albahaca y oliva.', 740, '/assets/videos/pizza-burrata.mp4', '/assets/images/menu/pizza-burrata.jpeg', '/assets/images/menu/pizza-burrata.jpeg', '🍕', '#be5d3d', '["Pomodoro","Mozzarella","Burrata cremosa","Albahaca fresca"]', '["Para compartir","Vegetariano"]', 2),
  ('dish-ravioles-calabaza', 'casa-brasa', 'pastas', 'ravioles-calabaza', 'Ravioles de Calabaza', 'Ravioles artesanales, crema de parmesano y nueces tostadas.', 620, '/assets/videos/ravioles-calabaza.mp4', '/assets/images/menu/ravioles-calabaza.jpeg', '/assets/images/menu/ravioles-calabaza.jpeg', '🍝', '#bb7d44', '["Ravioles de calabaza","Crema de parmesano","Nueces tostadas","Salvia"]', '["Artesanal","Vegetariano"]', 3),
  ('dish-milanesa-brasa', 'casa-brasa', 'principales', 'milanesa-brasa', 'Milanesa Brasa', 'Milanesa crocante, provolone, tomate asado y papas rústicas.', 780, '/assets/videos/milanesa-brasa.mp4', '/assets/images/menu/milanesa-brasa.png', '/assets/images/menu/milanesa-brasa.png', '🥩', '#a8573f', '["Milanesa crocante","Provolone","Tomate asado","Papas rústicas"]', '["De la casa"]', 4),
  ('dish-tacos-crispy', 'casa-brasa', 'principales', 'tacos-crispy', 'Tacos Crispy', 'Pollo crispy, palta, repollo, salsa fresca y lima.', 590, '/assets/videos/tacos-crispy.mp4', '/assets/images/menu/tacos-crispy.jpeg', '/assets/images/menu/tacos-crispy.jpeg', '🌮', '#8c6c36', '["Pollo crispy","Palta","Repollo morado","Salsa fresca","Lima"]', '["Fresco","Para compartir"]', 5),
  ('dish-cheesecake-pistacho', 'casa-brasa', 'postres', 'cheesecake-pistacho', 'Cheesecake Pistacho', 'Cheesecake cremoso, pistacho tostado y chocolate blanco.', 390, '/assets/videos/cheesecake-pistacho.mp4', '/assets/images/menu/cheesecake-pistacho.jpeg', '/assets/images/menu/cheesecake-pistacho.jpeg', '🍰', '#7f8960', '["Cheesecake cremoso","Pistacho tostado","Chocolate blanco"]', '["Dulce final"]', 6),
  ('dish-limonada-brasa', 'casa-brasa', 'bebidas', 'limonada-brasa', 'Limonada Brasa', 'Limón, menta, jengibre y hielo.', 210, '/assets/videos/limonada-brasa.mp4', '/assets/images/menu/limonada-brasa.jpeg', '/assets/images/menu/limonada-brasa.jpeg', '🍋', '#7f9854', '["Limón","Menta","Jengibre","Hielo"]', '["Refrescante"]', 7);

INSERT OR IGNORE INTO candidates (id, restaurant_id, slug, name, description, estimated_price, would_order_pct, seed_votes, seed_notify_count, avg_attention, video_url, poster_url, emoji, accent, status, ingredients_json, sort_order)
VALUES
  ('candidate-burger-bbq', 'casa-brasa', 'burger-bbq-ahumada', 'Burger BBQ Ahumada', 'Carne a la brasa, cheddar, cebolla dulce y BBQ ahumada.', 760, 72, 438, 186, '7.2', '/assets/videos/tu-decides-burger-bbq.mp4', '/assets/images/posters/tu-decides-burger-bbq.jpeg', '🍔', '#cb6848', 'Mejor candidato', '["Carne a la brasa","Cheddar","Cebolla dulce","BBQ ahumada"]', 1),
  ('candidate-taco-fuego', 'casa-brasa', 'taco-fuego', 'Taco Fuego', 'Carne braseada, crema de palta, chile dulce y lima.', 640, 61, 354, 121, '6.3', '/assets/videos/tu-decides-taco-fuego.mp4', '/assets/images/posters/tu-decides-taco-fuego.jpeg', '🌮', '#b3623e', 'Buen interés', '["Carne braseada","Crema de palta","Chile dulce","Lima"]', 2),
  ('candidate-gnocchi-crocante', 'casa-brasa', 'gnocchi-crocante', 'Gnocchi Crocante', 'Gnocchi dorados, crema de hongos, parmesano y tomillo.', 680, 39, 201, 67, '4.6', '/assets/videos/tu-decides-gnocchi.mp4', '/assets/images/posters/tu-decides-gnocchi.jpeg', '🍝', '#92714c', 'Necesita más validación', '["Gnocchi dorados","Crema de hongos","Parmesano","Tomillo"]', 3);
