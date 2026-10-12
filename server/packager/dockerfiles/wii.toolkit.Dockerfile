FROM devkitpro/devkitppc:latest AS main_builder
ENV CATALOG_NON_INTERACTIVE=1
WORKDIR /app

COPY . .

RUN /opt/devkitpro/portlibs/wii/bin/powerpc-eabi-cmake -B build-wii -DCMAKE_BUILD_TYPE=Release -DSE_BUNDLE=OFF -DSE_APP_NAME=__SE_APP_NAME__ -DSE_APP_AUTHOR=__SE_APP_AUTHOR__ -DSE_APP_DESCRIPTION=__SE_APP_DESCRIPTION__ -DSE_APP_VERSION=__SE_APP_VERSION__ -DSE_APP_TITLEID=__SE_APP_TITLEID__ && cmake --build build-wii -j2

COPY --from=toolkitctx capture-toolkit.sh /capture-toolkit.sh
RUN sh /capture-toolkit.sh /app /app/build-wii

FROM scratch AS exporter
COPY --from=main_builder /toolkit /
