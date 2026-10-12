FROM skylyrac/blocksds:slim-latest AS main_builder
ENV CATALOG_NON_INTERACTIVE=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends cmake pkg-config patch

COPY . .

RUN cmake -B build-nds -DCMAKE_TOOLCHAIN_FILE=$BLOCKSDS/cmake/BlocksDS.cmake -DCMAKE_BUILD_TYPE=Release -DSE_AUDIO=OFF -DSE_BUNDLE=OFF -DSE_APP_NAME=__SE_APP_NAME__ -DSE_APP_AUTHOR=__SE_APP_AUTHOR__ -DSE_APP_DESCRIPTION=__SE_APP_DESCRIPTION__ -DSE_APP_VERSION=__SE_APP_VERSION__ && cmake --build build-nds -j2

COPY --from=toolkitctx capture-toolkit.sh /capture-toolkit.sh
RUN sh /capture-toolkit.sh /app /app/build-nds

FROM scratch AS exporter
COPY --from=main_builder /toolkit /
