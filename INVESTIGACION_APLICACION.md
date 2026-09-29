# Investigación funcional y técnica de Plato360 / Casa Brasa

**Proyecto analizado:** `C:\Users\btxpa\Desktop\Nueva carpeta\plato360`  
**Fecha del análisis:** 21 de septiembre de 2026  
**Estado verificado:** aplicación ejecutándose en desarrollo, validación de código aprobada y compilación de producción exitosa.

## 1. Resumen ejecutivo

La aplicación es un prototipo comercial de una plataforma de menú digital para restaurantes. La marca ficticia usada para demostrar el producto es **Casa Brasa**, un restaurante de Montevideo. La propuesta central consiste en reemplazar o complementar la carta tradicional con una experiencia visual de formato vertical, similar a un feed de videos cortos: cada plato ocupa una pantalla, reproduce un video en bucle y permite consultar detalles o agregarlo a una selección.

El producto no se limita a mostrar un menú. Reúne tres ideas conectadas:

1. **Experiencia del cliente:** descubrir platos mediante videos, consultar una carta tradicional, guardar productos en un pedido local y explorar platos futuros.
2. **Validación de nuevos platos:** los clientes pueden votar ideas en prueba y solicitar un aviso cuando sean lanzadas.
3. **Inteligencia para el restaurante:** un panel presenta señales de interés, atención, revisitas y elección para ayudar a decidir qué platos promover, revisar o incorporar.

En su estado actual, la aplicación funciona como una **demo navegable de alta fidelidad**. La interfaz, los videos, la navegación y la persistencia local funcionan, pero no existe un backend operativo para recibir pedidos, registrar analítica real, guardar votos, almacenar correos o administrar el contenido. Los números del panel y los candidatos son datos de ejemplo definidos en archivos TypeScript.

## 2. Público objetivo y propuesta de valor

### Usuario comprador

El comprador potencial es un restaurante que busca:

- presentar mejor sus platos en dispositivos móviles;
- diferenciarse de una carta basada únicamente en texto y fotos;
- detectar qué platos generan interés antes del pedido;
- probar nuevas ideas antes de invertir en incorporarlas;
- captar intención de compra y potenciales interesados en futuros lanzamientos.

### Usuario final

El usuario final es el cliente del restaurante. Puede recorrer la carta visual, filtrar por categoría, abrir detalles, agregar platos a una selección, modificar cantidades, votar candidatos y manifestar interés en recibir un aviso.

### Mensaje comercial

La aplicación vende la idea de que una carta deja de ser una lista informativa y se convierte en una experiencia que “despierta ganas”. El mensaje se apoya en tres beneficios explícitos:

- mostrar los platos como realmente se ven;
- descubrir cuáles atraen más;
- validar ideas futuras antes de lanzarlas.

## 3. Áreas y rutas de la aplicación

| Ruta | Área | Contenido y comportamiento |
|---|---|---|
| `/` | Landing comercial | Presentación del producto, comparación entre carta tradicional y visual, beneficios, funcionamiento, vista previa del dashboard, candidatos futuros y llamada a contacto por WhatsApp. |
| `/carta` | Carta visual | Feed vertical de siete platos con reproducción automática de video, selector de categorías, acceso a detalles y acción para agregar al pedido. |
| `/carta/tradicional` | Carta tradicional | Alternativa con fotos, categorías, nombres, descripciones, ingredientes, precios y botones para agregar productos. |
| `/carta/plato/[slug]` | Detalle de plato | Video, categoría, nombre, precio, descripción, etiquetas, ingredientes y acción de agregado. |
| `/carta/pedido` | Mi pedido | Lista de platos seleccionados, cantidades, subtotal por línea, total y controles para sumar, restar o eliminar. |
| `/carta/proximamente` | “Tu decides” | Feed vertical de tres platos en prueba; permite votar, muestra una celebración y luego ofrece registrar un correo para recibir novedades. |
| `/carta/proximamente/[slug]` | Detalle de candidato | Datos del plato futuro, precio estimado, intención declarada, votos, tiempo de atención, ingredientes y acciones de voto/aviso. |
| `/carta/restaurante` | Dashboard del restaurante | Indicadores generales, nivel de interés, ranking por atención, comparación entre interés y elección, revisitas e interpretaciones en lenguaje simple. |
| `/carta/restaurante/pruebas` | Dashboard de pruebas | Comparación de candidatos, votos, solicitudes de aviso y recomendación del plato con mayor señal de interés. |

Todas las rutas principales fueron consultadas contra el servidor local y respondieron correctamente. La aplicación utiliza una única ruta opcional y capturadora bajo `/carta/[[...path]]`; la selección de pantalla se hace en el cliente inspeccionando la URL.

## 4. Experiencia del cliente

### 4.1 Carta visual

La carta principal presenta un plato por pantalla dentro de una representación de teléfono. El desplazamiento vertical cambia el plato activo. Un `IntersectionObserver` detecta qué tarjeta ocupa la mayor parte del área visible y activa únicamente su video, pausando los demás.

Funciones disponibles:

- reproducción automática, silenciosa, en bucle y apta para reproducción en línea;
- indicador de posición dentro del total de platos;
- nombre, categoría, descripción y precio;
- acceso al detalle del plato;
- agregado directo al pedido;
- confirmación mediante aviso temporal;
- selector modal de categorías;
- navegación inferior entre carta visual, carta tradicional, “Tu decides” y pedido;
- acceso al dashboard después de avanzar en el feed.

Las categorías disponibles son Recomendados, Burgers, Pizzas, Pastas, Principales, Postres y Bebidas. “Recomendados” muestra la colección completa; el resto filtra por la categoría exacta.

### 4.2 Carta tradicional

La vista tradicional ofrece una experiencia más familiar: una portada editorial, horarios y ubicación, un plato destacado, filtros por categoría y tarjetas en cuadrícula. Cada tarjeta contiene foto, etiqueta, nombre, precio, descripción y hasta tres ingredientes.

Esta vista comparte el mismo pedido con la carta visual. El cambio entre ambas no pierde los productos seleccionados porque el estado vive en el componente principal y luego se persiste en el navegador.

### 4.3 Detalle de un plato

La pantalla de detalle amplía la información del producto y conserva el lenguaje visual de la experiencia móvil. Permite agregar el plato y volver al feed. Cuando el identificador no coincide con un plato existente, se muestra una pantalla de “no disponible”.

Observación técnica: esa pantalla visual de error sigue respondiendo con HTTP 200 porque la resolución ocurre dentro del componente cliente. Para buscadores, monitoreo y analítica sería preferible devolver un 404 real.

### 4.4 Pedido

El pedido es una selección local, no una orden enviada al restaurante. Incluye:

- miniatura representada por emoji y color del plato;
- precio unitario y categoría;
- controles para aumentar o reducir unidades;
- eliminación directa;
- total calculado en tiempo real;
- estado vacío con retorno a la carta;
- acción final “Listo, esto pediría”.

La acción final solo abre un modal informativo. No envía el pedido por WhatsApp, no crea una orden, no procesa pagos y no se integra con cocina, caja o sistema POS.

## 5. Módulo “Tu decides”

Este módulo sirve para validar platos antes de incorporarlos al menú. Presenta cada candidato como una pieza visual con video, precio estimado, porcentaje de intención de compra y nivel de interés.

El flujo principal es:

1. el cliente recorre los candidatos;
2. pulsa “Yo lo probaría”;
3. la interfaz registra el voto en el navegador;
4. aparece una celebración con confeti;
5. se abre una invitación para recibir un aviso;
6. el usuario puede componer su correo eligiendo un dominio común o escribiendo otro.

La validación del correo comprueba de forma básica el nombre local y la estructura del dominio. Sin embargo, el correo ingresado no se almacena ni se envía: el callback final ignora el valor y solo guarda en `localStorage` que ese candidato fue marcado para aviso.

En el detalle de un candidato existe una variante más simple: la solicitud de aviso se marca inmediatamente y se muestra un modal informativo, sin pedir correo. Esto produce una diferencia de comportamiento entre el feed y la pantalla de detalle.

## 6. Vista del restaurante

### 6.1 Resumen de la carta

El dashboard comunica la analítica en términos comprensibles para un operador gastronómico. Muestra:

- 2.846 aperturas de la carta;
- 5,4 segundos de atención promedio por plato;
- Smash Trufa como plato que más atrajo;
- Pizza Burrata como plato más agregado;
- Cheesecake Pistacho como plato más revisitado.

Incluye además:

- una puntuación de interés de 8,7/10 para Smash Trufa;
- ranking de seis platos por tiempo de atención;
- gráfico conceptual que compara cuánto interés genera un plato con cuánto se elige;
- ranking de platos revisados nuevamente;
- tres interpretaciones editoriales en lenguaje simple.

Los datos permiten ilustrar decisiones como revisar precio, descripción o presentación cuando un plato llama la atención pero convierte poco.

### 6.2 Platos en prueba

El panel de pruebas resume:

- tres ideas activas;
- 993 votos de ejemplo;
- 374 personas interesadas en recibir un aviso;
- Burger BBQ Ahumada como mejor candidato, con 72% de intención declarada.

La recomendación combina porcentaje de intención, cantidad de votos, solicitudes de aviso y tiempo de atención. Los rankings enlazan nuevamente con la experiencia que ve el cliente.

### Naturaleza de los datos

Todo el contenido analítico se importa desde `data/analytics.ts` y `data/candidates.ts`. No existe instrumentación que mida reproducción, tiempo de visualización, apertura de detalle, revisitas, agregado o conversión. El panel está claramente marcado como “Datos de ejemplo”, lo cual es correcto para una demo.

## 7. Contenido cargado

### 7.1 Restaurante

- **Nombre:** Casa Brasa
- **Ubicación:** Montevideo
- **Tagline:** “Cocina que entra por los ojos”
- **Contacto:** enlace a WhatsApp con mensaje predefinido
- **Situación actual del contacto:** el número `59800000000` es un valor de muestra y debe reemplazarse antes de publicar.

### 7.2 Platos actuales

| Plato | Categoría | Precio |
|---|---|---:|
| Smash Trufa | Burgers | $690 |
| Pizza Burrata | Pizzas | $740 |
| Ravioles de Calabaza | Pastas | $620 |
| Milanesa Brasa | Principales | $780 |
| Tacos Crispy | Principales | $590 |
| Cheesecake Pistacho | Postres | $390 |
| Limonada Brasa | Bebidas | $210 |

Cada plato posee identificador, descripción, video, foto, póster, emoji, color, ingredientes y etiquetas opcionales.

### 7.3 Platos candidatos

| Candidato | Precio estimado | Lo pediría | Votos | Quieren aviso | Atención promedio |
|---|---:|---:|---:|---:|---:|
| Burger BBQ Ahumada | $760 | 72% | 438 | 186 | 7,2 s |
| Taco Fuego | $640 | 61% | 354 | 121 | 6,3 s |
| Gnocchi Crocante | $680 | 39% | 201 | 67 | 4,6 s |

## 8. Diseño y experiencia visual

La dirección visual combina una estética gastronómica cálida con un tratamiento editorial:

- fondo oscuro carbón y superficies crema;
- acento naranja/coral, apoyado por tonos salvia y amarillo;
- tipografía de interfaz basada en Arial/Helvetica y títulos con Georgia;
- tarjetas redondeadas, etiquetas tipo píldora y abundante contraste;
- videos verticales con viñeta, superposición de contenido y estados alternativos;
- simulaciones de teléfono para explicar la experiencia móvil desde escritorio.

La aplicación contempla escritorio, tablet y móvil mediante cortes principales en 1050 px y 720 px. También incluye reglas para `prefers-reduced-motion`, reduciendo animaciones y transiciones cuando el sistema del usuario lo solicita.

Si un video falla, se mantiene una composición gráfica de respaldo con emoji, color y texto. Esto evita que una ausencia de medios deje un espacio vacío.

### Recursos multimedia

El directorio público contiene 27 archivos y pesa aproximadamente **29,07 MB**:

- 10 videos MP4;
- 16 imágenes o SVG;
- 1 archivo informativo.

Los diez videos esperados están presentes. Los archivos individuales más pesados son los videos de 1,5 a 2,9 MB, el póster de Smash Trufa de aproximadamente 2,2 MB y la imagen PNG de Milanesa Brasa de aproximadamente 1,4 MB. Para producción convendría generar variantes adaptativas, comprimir imágenes y revisar la estrategia de precarga.

## 9. Arquitectura técnica

### Tecnologías principales

- Node.js 24.21.0 en el entorno analizado; el proyecto exige Node.js 22.13 o superior.
- Next.js 16.3.4 y React 19.2.6.
- TypeScript 5.9 con modo estricto.
- Vinext sobre Vite 8 para compilar el modelo de aplicación de Next hacia Cloudflare.
- Cloudflare Workers/Wrangler como entorno de ejecución y despliegue.
- Tailwind CSS 4 importado desde la hoja global.
- Drizzle ORM preparado para Cloudflare D1.
- Lucide React para iconografía.
- Catálogo de componentes shadcn/base-ui disponible en `components/ui`.

### Organización

- `app/page.tsx`: entrada de la landing.
- `app/carta/[[...path]]/page.tsx`: entrada única para todas las variantes de la carta.
- `components/CasaBrasaSite.tsx`: concentra las pantallas, navegación, estado y flujos principales.
- `data/`: restaurante, platos, candidatos y analítica de ejemplo.
- `public/assets/`: marca, imágenes, pósteres y videos.
- `db/`: inicialización de Drizzle y esquema vacío.
- `app/chatgpt-auth.ts`: utilidades de autenticación preparadas pero no utilizadas por las pantallas actuales.
- `.openai/hosting.json`: configuración de hosting; D1 y R2 están desactivados actualmente.

### Observación de mantenibilidad

`CasaBrasaSite.tsx` tiene alrededor de 65 KB y 701 líneas; `app/globals.css` ronda los 91 KB. La aplicación está muy concentrada en esos dos archivos. Esto acelera un prototipo, pero a medida que el producto crezca convendría separar rutas, vistas, componentes de dominio, hooks y estilos por módulo.

Aunque hay 61 archivos en `components/ui`, las pantallas principales no importan directamente ese kit; la experiencia está construida mayormente con elementos propios y CSS personalizado. El catálogo puede ser útil a futuro, pero hoy aumenta el volumen del proyecto sin formar parte del flujo principal.

## 10. Estado, persistencia e integraciones

La aplicación mantiene tres objetos en el navegador:

- `casa-brasa-cart`: cantidades del pedido;
- `casa-brasa-votes`: candidatos votados;
- `casa-brasa-notified`: candidatos marcados para aviso.

Esto permite conservar la selección entre recargas en el mismo navegador. No existe sincronización entre dispositivos ni asociación con una identidad.

El código contiene preparación para Drizzle y Cloudflare D1, pero:

- el esquema está deliberadamente vacío;
- la configuración de hosting no declara una base D1;
- ninguna pantalla llama a `getDb()`;
- no hay rutas API activas para la aplicación;
- las utilidades de inicio de sesión con ChatGPT no están conectadas al producto.

La única integración externa visible es el enlace comercial a WhatsApp.

## 11. Qué funciona hoy y qué está simulado

| Capacidad | Estado actual |
|---|---|
| Navegación entre pantallas | Funcional |
| Reproducción y pausa de videos | Funcional |
| Filtrado por categorías | Funcional |
| Agregar, quitar y cambiar cantidades | Funcional en el navegador |
| Persistencia del pedido | Funcional mediante `localStorage` |
| Voto a candidatos | Funcional solo como marca local |
| Solicitud de aviso | Funcional solo como marca local; el correo no se guarda |
| Cálculo del total | Funcional |
| Envío del pedido | Simulado mediante modal |
| Analítica de comportamiento | Datos estáticos de ejemplo |
| Dashboard del restaurante | Visualmente funcional, sin datos reales |
| Selector “Últimos 30 días” | Decorativo, sin cambio de período |
| Botones de información y opciones | Algunos son decorativos y no ejecutan acciones |
| Código QR | Representación visual; no genera un QR escaneable |
| Contacto por WhatsApp | Enlace real con número de muestra |
| Base de datos | Preparada, no configurada ni usada |
| Autenticación | Utilidades presentes, no aplicada |
| Administración de menú | No existe |

## 12. Validación técnica realizada

Durante la investigación se verificó lo siguiente:

- instalación completa de 670 paquetes;
- servidor de desarrollo operativo en `http://localhost:5173/`;
- respuesta HTTP 200 en todas las rutas funcionales principales;
- `npm run lint` finalizado sin errores ni advertencias reportadas;
- `npm run build` finalizado correctamente;
- compilación de cliente, servidor, RSC y SSR exitosa;
- disponibilidad de los diez videos referenciados por los datos.

La compilación clasifica `/carta/:path*` como ruta dinámica. La herramienta Vinext no pudo clasificar completamente `/` mediante su análisis estático, pero el proceso terminó con éxito.

## 13. Hallazgos, limitaciones y riesgos

### Prioridad alta para convertirla en producto real

1. **No existe captura de eventos.** El principal valor prometido —saber qué genera interés— todavía no tiene implementación técnica.
2. **No existe backend transaccional.** Pedidos, votos y avisos no salen del dispositivo del usuario.
3. **El correo se descarta.** La interfaz da a entender que habrá una notificación, pero el dato ingresado no se guarda.
4. **El WhatsApp es de muestra.** La llamada comercial no llegará a un contacto válido hasta configurar el número.
5. **No hay administración.** Platos, precios, horarios, contenido visual y analítica requieren editar código.
6. **No hay privacidad ni consentimiento.** Si se implementan correos y analítica, será necesario informar finalidad, retención, consentimiento y mecanismo de baja.

### Calidad y consistencia

- Las rutas de entidades inexistentes deberían devolver 404 real.
- El botón de marca en el encabezado de la carta declara “Ir al inicio”, pero no tiene una acción asignada.
- Algunos controles visuales —más opciones, información y período— parecen interactivos pero no hacen nada.
- Los modales no implementan una gestión completa de foco ni cierre por teclado.
- La lectura de `localStorage` está protegida ante errores, pero las escrituras no están dentro de un bloque de manejo de excepciones.
- El logo configurable de `data/restaurant.ts` no se usa en el componente de marca, que renderiza texto y una estrella.
- El objeto de colores `theme` tampoco controla la hoja de estilos; los colores se repiten como variables CSS independientes.
- No se encontraron pruebas unitarias, de integración ni end-to-end.
- La arquitectura de un único componente cliente grande limita el aislamiento, las pruebas y la carga por ruta.

### Rendimiento

- La experiencia depende fuertemente de video y suma unos 29 MB de recursos públicos.
- Los videos inactivos evitan precarga completa y solo el activo intenta reproducirse, una decisión positiva.
- Conviene servir video con variantes de resolución/bitrate, caché CDN y pósteres optimizados.
- Las imágenes se renderizan con `<img>` estándar; podrían incorporarse tamaños explícitos, formatos modernos y una estrategia de optimización adecuada al entorno Cloudflare.

## 14. Fortalezas actuales

- Propuesta de producto clara y fácil de demostrar.
- Identidad visual consistente y más cuidada que la de un prototipo técnico básico.
- Conexión convincente entre experiencia del cliente y valor para el restaurante.
- Dos modalidades de carta para distintos hábitos de navegación.
- Datos de ejemplo bien elegidos para explicar atención, conversión y revisitas.
- Flujo “Tu decides” con potencial comercial real para validar lanzamientos.
- Buen comportamiento alternativo cuando un video no carga.
- Adaptación responsive y consideración de movimiento reducido.
- TypeScript estricto, lint limpio y compilación de producción exitosa.
- Datos del restaurante y del menú centralizados, lo que facilita una primera personalización manual.

## 15. Hoja de ruta recomendada

### Fase 1: producto mínimo real

1. Definir el destino real del pedido: WhatsApp, mesa, comanda, POS o pago.
2. Crear un modelo de datos para restaurantes, locales, cartas, categorías, platos, candidatos, votos, eventos y suscripciones.
3. Activar D1 u otra base de datos y exponer endpoints validados.
4. Instrumentar eventos: impresión del plato, tiempo visible, reproducción, detalle, agregado, revisita, voto y pedido final.
5. Guardar votos y solicitudes de aviso con protección contra duplicados y consentimiento explícito.
6. Sustituir el número de WhatsApp y generar un QR real para cada carta/local.
7. Corregir códigos 404 y estados de error.

### Fase 2: operación del restaurante

1. Incorporar autenticación y aislamiento por restaurante.
2. Crear un panel para editar platos, precios, disponibilidad, categorías y medios.
3. Permitir definir períodos y filtros reales en el dashboard.
4. Añadir publicación/borrador y programación de candidatos.
5. Implementar exportación o integración con herramientas operativas.

### Fase 3: robustez y escala

1. Dividir el componente principal por rutas y dominios.
2. Extraer hooks para pedido, analítica, navegación, votos y reproducción.
3. Añadir pruebas unitarias, integración y recorridos end-to-end.
4. Optimizar imágenes y video con CDN y formatos adaptativos.
5. Completar accesibilidad de diálogos, teclado, foco y controles.
6. Revisar SEO, metadatos por plato, sitemap y contenido compartible.
7. Implementar observabilidad, manejo de errores y métricas de rendimiento.

## 16. Conclusión

Plato360/Casa Brasa es una demostración sólida de un producto para restaurantes que combina **menú visual, intención de pedido, validación de nuevos platos y analítica de interés**. La aplicación ya permite recorrer la experiencia completa y comunicar con claridad el valor comercial. Su mayor brecha no está en la presentación, sino en la capa operativa: hoy muestra cómo funcionaría el producto, pero todavía no recopila, procesa ni entrega datos reales.

El camino natural es conservar la experiencia visual existente y construir debajo una plataforma multi-restaurante con eventos, base de datos, administración, pedidos e infraestructura de notificaciones. Con esas piezas, la demo podría evolucionar de escaparate comercial a producto utilizable en un restaurante real.
