FROM public.ecr.aws/docker/library/node:22-bookworm-slim

# Lambda WebAdapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter
ENV PORT=3000

# 日本時間 (Asia/Tokyo) の設定
RUN apt-get update && apt-get install -y tzdata && \
    ln -sf /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata

WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
# ランタイムに必要な依存関係のみをインストール
RUN pnpm install --prod

COPY ./build ./build

CMD ["node", "/app/build/index.js"]
#CMD ["ORIGIN=http://localhost:3000 node /app/build/index.js"]
