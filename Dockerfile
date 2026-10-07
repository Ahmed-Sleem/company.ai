# The whole product in one container: the API, and the built app it serves from the same origin.
#
#   docker build -t company-os .
#   docker run --rm -p 8787:8787 company-os      # → http://localhost:8787
#
# The database is a file inside the container (PGlite — see services/api/src/server.ts), seeded on
# first start. Free hosting tiers have no persistent disk, so a redeploy starts from the seed again;
# that is the right behaviour for a demo, and DATABASE_URL switches to a real Postgres when there is
# one (that is the only change a hosted database needs).
FROM node:20-slim

WORKDIR /app

# Everything, then install. Copying the lockfile first would cache better, but a workspace install
# needs every package.json present anyway, so the honest order is: source, then `npm ci`.
COPY . .
RUN npm ci --no-fund --no-audit

# The app, built here so the image is reproducible from the repository alone.
RUN npm run build -w @company/web

ENV STATIC_DIR=/app/apps/web/dist \
    PGLITE_DIR=/app/.data/pglite \
    PORT=8787
EXPOSE 8787

# tsx runs the TypeScript server directly (it is a dev dependency; this image keeps dev
# dependencies on purpose — that is what makes the build self-contained).
CMD ["npx", "tsx", "services/api/src/server.ts"]
