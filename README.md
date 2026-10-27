# UGC Studio

App interna para generar videos UGC verticales (9:16) con modelos IA: producto → modelo → guion → clips → edición con subtítulos.

## Motores (todo vía fal.ai, una sola key)
| Paso | Modelo | Costo |
|---|---|---|
| Guion | Claude (API Anthropic) | ~US$ 0,01 |
| Imagen de la modelo con el producto | `fal-ai/nano-banana-2/edit` | US$ 0,08 / imagen |
| Clip con voz y lip-sync | `fal-ai/veo3.1/lite/image-to-video` (720p, con audio) | US$ 0,05 / s |

Video típico de 2 escenas (8 s + 6 s) ≈ **US$ 0,86**.

## Deploy
1. **Worker**: en `worker/`
   ```
   npx wrangler deploy
   npx wrangler secret put FAL_KEY        # fal.ai → Dashboard → Keys
   npx wrangler secret put ANTHROPIC_KEY  # console.anthropic.com
   npx wrangler secret put APP_TOKEN      # cualquier clave larga, la usás en la app
   ```
   Opcional: descomentar `ALLOWED_ORIGIN` en `wrangler.toml` con tu dominio de GitHub Pages.
2. **App**: subir `index.html` a un repo de GitHub Pages (ej. `lucasbarranco-blip/ugc-studio`).
3. Abrir la app → ⚙ Conexión → URL del Worker + APP_TOKEN → Probar.

## Flujo
1. Foto del producto + beneficios.
2. Elegir perfil de modelo (o subir referencia propia).
3. Generar guion → revisar → **Generar imágenes** (aprobás la modelo antes de gastar en video) → **Generar clips**.
4. Renderizar: une clips, subtítulos, hook arriba, placa final con CTA y etiqueta "Hecho con IA". Exporta MP4 (Chrome) o WebM.

## Notas
- Meta y TikTok piden etiquetar contenido realista hecho con IA; la etiqueta viene activada por defecto.
- El guion está configurado para no inventar testimonios ni resultados: la modelo *presenta* el producto.
- Si el modelo de Claude cambia de nombre, editar `CLAUDE_MODEL` en `wrangler.toml`.
