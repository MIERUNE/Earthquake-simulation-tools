FROM public.ecr.aws/docker/library/node:22-bookworm-slim

# Lambda WebAdapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter
ENV PORT=3000

# 日本時間 (Asia/Tokyo) の設定
RUN apt-get update && apt-get install -y tzdata && \
    ln -sf /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.11.0

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/aws-client/package.json ./packages/aws-client/

# Install dependencies (production only)
RUN pnpm install --prod --frozen-lockfile --filter @mosiri/admin...

# Copy built application
# NOTE: Build must be done BEFORE docker build (e.g., in CI/CD pipeline with `pnpm build:admin`)
# This separates build errors from Docker errors and enables build caching in CI/CD
COPY apps/admin/build ./apps/admin/build
COPY packages ./packages

# Set working directory to admin app
WORKDIR /app/apps/admin

CMD ["node", "build/index.js"]
