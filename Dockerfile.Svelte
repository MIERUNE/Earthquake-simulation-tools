# Node.js 22 をベースにする
FROM node:22

# 日本時間 (Asia/Tokyo) の設定
RUN apt-get update && apt-get install -y tzdata && \
    ln -sf /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata


# 作業ディレクトリを設定
WORKDIR /app

# pnpm をインストール
RUN corepack enable

# package.json と pnpm-lock.yaml をコピー
COPY package.json pnpm-lock.yaml ./

# 依存関係をインストール
RUN pnpm install

EXPOSE 5173
CMD ["pnpm", "run", "docker","--host"]
