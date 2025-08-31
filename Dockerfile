# Build stage
FROM node:lts-alpine AS builder
WORKDIR /app

# Build argument for version
ARG GIT_COMMIT_COUNT

# Install OS deps for Prisma engines (glibc etc.) and build tooling
RUN apk add --no-cache openssl

# Copy manifests and install deps
COPY package.json pnpm-lock.yaml* .npmrc* ./
# Use pnpm with the existing lockfile for deterministic installs
RUN npm i -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate version file with build-time version
RUN echo "export const VERSION = '${GIT_COMMIT_COUNT}';" > src/lib/version.js

# Build SvelteKit and generate Prisma clients
# Note: build script already runs prisma generate for both schemas
RUN pnpm build

# Runtime stage
FROM node:lts-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .
EXPOSE 3000
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
CMD [ "node", "./build/index.js" ]