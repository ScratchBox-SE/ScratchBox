FROM vitasdk/vitasdk:latest AS main_builder
ENV CATALOG_NON_INTERACTIVE=1
WORKDIR /app

COPY . .

# Temporary fix until this is merged upstream
RUN wget -O $VITASDK/share/vita.cmake "https://raw.githubusercontent.com/gradylink/vita-toolchain/refs/heads/fix/cmake/cmake_toolchain/vita.cmake"

RUN cmake -DCMAKE_TOOLCHAIN_FILE=$VITASDK/share/vita.toolchain.cmake -DCMAKE_BUILD_TYPE=Release -DSE_RENDERER=sdl2 -DSE_AUDIO_ENGINE=sdl2 -DSE_BUNDLE=ON -DSE_APP_NAME=__SE_APP_NAME__ -DSE_APP_AUTHOR=__SE_APP_AUTHOR__ -DSE_APP_DESCRIPTION=__SE_APP_DESCRIPTION__ -DSE_APP_VERSION=__SE_APP_VERSION__ -DSE_APP_TITLEID=__SE_APP_TITLEID__ -B build-vita && cmake --build build-vita -j2

COPY --from=toolkitctx capture-toolkit.sh /capture-toolkit.sh
RUN sh /capture-toolkit.sh /app /app/build-vita

FROM scratch AS exporter
COPY --from=main_builder /toolkit /
