# syntax=docker/dockerfile:1
# Development image: Vite dev server with HMR. (Production would be `vite build` + any static host.)

FROM node:22-alpine AS deps
# living-kb is a git dependency; the lockfile pins it as git+ssh, which has no keys in a container.
# The repo is public, so rewrite to HTTPS instead of editing the lockfile.
RUN apk add --no-cache git \
 && git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"
WORKDIR /app
# no .git in the build context → skip installing git hooks
ENV HUSKY=0
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM node:22-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development HUSKY=0
# run as the unprivileged `node` user; it must own node_modules (Vite writes node_modules/.vite)
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
