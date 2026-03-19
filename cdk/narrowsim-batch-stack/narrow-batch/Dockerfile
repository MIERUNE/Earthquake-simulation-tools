FROM --platform=linux/amd64 debian:12.8

# タイムゾーンの非対話的設定
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Tokyo

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata \
    unzip \
    curl \
    less \
    groff \
    tar \
    gzip \
    software-properties-common \
    build-essential \
    libgl1-mesa-glx \
    libglu1-mesa \
    libxi6 \
    libxrender1 \
    libxrandr2 \
    wget \
    libxkbcommon-x11-0

# タイムゾーンをAsia/Tokyoに設定
RUN ln -sf /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone

# タイムゾーンの設定確認用
RUN date

# Blender のダウンロードとインストール
RUN wget https://ftp.halifax.rwth-aachen.de/blender/release/Blender4.3/blender-4.3.2-linux-x64.tar.xz
RUN tar -xf blender-4.3.2-linux-x64.tar.xz

# Blenderが動作するかを確認
RUN /blender-4.3.2-linux-x64/blender --version

# AWS CLI v2 のインストール
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws/

# .netのインストール
RUN wget https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
RUN dpkg -i packages-microsoft-prod.deb
RUN rm packages-microsoft-prod.deb
RUN apt-get update && apt-get install -y dotnet-sdk-8.0
RUN apt-get update && apt-get install -y aspnetcore-runtime-8.0

# wallstat のインストール
WORKDIR /wallstat/
COPY ./exec /wallstat/
RUN chmod 0744 /wallstat/calc5110
RUN chmod 0744 /wallstat/blender_script

# docker-entrypoint の設定
COPY ./docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod 0744 /docker-entrypoint.sh
RUN cat /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

# ---------------------------------
# data のセット (ローカル確認用)
# WORKDIR /data/
# COPY ./data /data/
# CMD ["/bin/bash"]

# コンテナ起動時に実行コマンド
# docker build -t test_run:latest .
# docker run -it --name test_run-container -d test_run:latest /bin/bash
