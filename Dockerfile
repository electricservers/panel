# Both stages share the same base image so the `better-sqlite3` native
# addon built in `build` is guaranteed glibc-compatible with `runtime`.
FROM node:22-bookworm-slim AS build
WORKDIR /app

# bun is this project's package manager; python3/make/g++ back it up in case
# no prebuilt `better-sqlite3` binary matches this platform and it must
# compile from source.
RUN apt-get update -qq \
	&& apt-get install -qq --no-install-recommends -y ca-certificates curl unzip python3 make g++ \
	&& curl -fsSL https://bun.sh/install | bash \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists/*
ENV PATH="/root/.bun/bin:${PATH}"

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build
RUN bun install --frozen-lockfile --production

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/ip-ranges ./ip-ranges

EXPOSE 3000
CMD ["node", "build"]
