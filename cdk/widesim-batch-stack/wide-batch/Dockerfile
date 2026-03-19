FROM --platform=linux/amd64 debian:12.8

# タイムゾーンの非対話的設定
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Tokyo

# タイムゾーンをAsia/Tokyoに設定
RUN ln -sf /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    echo "Asia/Tokyo" > /etc/timezone
# タイムゾーンの設定確認用
RUN date

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y --no-install-recommends \
    locales \
    tzdata \
    unzip \
    curl \
    less \
    tar \
    gzip \
    wget \
    python3-full \
    python3-pip \
    git \
    make \
    libgl1 \
    gdal-bin \
    build-essential \
    libsqlite3-dev \
    libz-dev \
    ninja-build \
    gdb \
    cmake \
    libvtk9-dev \
    qtbase5-dev \
    nlohmann-json3-dev

# 環境変数を設定
ENV LANG=ja_JP.UTF-8 \
    LANGUAGE=ja_JP:ja \
    LC_ALL=ja_JP.UTF-8

# AWS CLI v2 のインストール
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws/

# tippecanoe インストール
RUN git clone https://github.com/mapbox/tippecanoe.git
RUN cd /tippecanoe && make -j && make install
RUN tippecanoe -v

# VTK ソースコードからインストール (apt-getでインストールするため不要)
# RUN git clone https://gitlab.kitware.com/vtk/vtk.git
# RUN cd /vtk && mkdir build
# RUN cd /vtk/build && cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=ON -DCMAKE_INSTALL_PREFIX=/usr/local
# RUN cd /vtk/build && make -j8 && sudo make install

# ja_JP.UTF-8の行のコメントを解除
RUN sed -i -E 's/# (ja_JP.UTF-8)/\1/' /etc/locale.gen
RUN locale-gen

RUN pip install pandas --break-system-packages
RUN pip install geopandas --break-system-packages
RUN pip install pyvista --break-system-packages
RUN pip install numpy --break-system-packages
RUN pip install debugpy --break-system-packages
RUN pip install vtk --break-system-packages
RUN pip install geojson --break-system-packages

#
WORKDIR /widesim/
COPY ./exec /widesim/
RUN cd /widesim/native && rm -rf build
RUN make build
RUN cp /widesim/native/build/main /widesim/main

RUN chmod 0744 /widesim/main
RUN chmod 0744 /widesim/main.py
RUN rm -rf /widesim/native
RUN rm -rf /widesim/.devcontainer
RUN rm -rf /widesim/.vscode

# docker-entrypoint の設定
COPY ./docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod 0744 /docker-entrypoint.sh
RUN cat /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
