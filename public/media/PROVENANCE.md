# Login background provenance

- `login-loop.mp4` and `login-poster.jpg` are rendered in code from the Refract refraction-lattice pattern. No generative video, no third-party footage.
- Source: `scripts/loop/loop.html` (canvas animation, periodic in time so frame 0 follows the last frame exactly) and `scripts/loop/render.mjs` (Playwright frame capture). Re-render: `node scripts/loop/render.mjs <frames-dir> 192`, then `ffmpeg -framerate 24 -i <frames-dir>/f%04d.png -an -c:v libx264 -crf 24 -pix_fmt yuv420p -movflags +faststart public/media/login-loop.mp4`.
- An earlier OpenArt (Veo 3.1) version was replaced on 14 Oct 2026 for being less elegant than the brand pattern.

# Waitlist film provenance

- The waitlist film is no longer a video. It runs live in the browser: `src/components/waitlist/Film.astro` (HTML cards and captions) over `src/scripts/waitlist-film.ts` (Three.js). The app sits on a tilting window that wipes between four screens; the client's abstract gradient shapes (`00-inputs/ai-shapes-2026-10-15/`, copied to `src/assets/ai-shapes/`) are extruded in 3D around it, recoloured teal to tangerine. One 24-second loop drives both layers, so it repeats seamlessly. No generative imagery, no third-party footage.
- The screens are 2× captures of this prototype (`scripts/video/capture.mjs`), resized to `public/waitlist/film/*.webp`. Every figure in the cards comes from the demo salon's metrics module. They were recaptured when the wordmark changed to Gloock, and the poster (`waitlist-feature-poster.jpg`, also the share image) is the film's frame at 4.6 s.
- The new-layout screenshots on `/upgrades` (`public/compare/*.webp`, not the `old-*` ones) are 2× captures from `scripts/upgrades/capture.mjs`, resized to 1280 × 800.
- `waitlist-feature-poster.jpg` is a frame of the live scene (t = 4.6 s), used before WebGL starts, when it is unavailable, and as the social share image.
- The waitlist bento uses no screenshots. Its "One answer" and "Speed to lead" windows are HTML and SVG (`src/scripts/waitlist-bento.ts`), and "Built for the phone" is a CSS phone frame (`src/scripts/waitlist-phone.ts`) whose screen is drawn in code (`src/scripts/waitlist-phone-ui.ts`). Joy's and Dash's windows replay conversations taken from the demo salon's threads (`src/scripts/waitlist-ai.ts`). All of them read the demo salon's data, so the figures match the prototype.
- The shapes floating behind the page (`src/scripts/waitlist-float.ts`) are the same extruded client shapes as the film.
