FROM node:20-trixie-slim AS main_builder
ENV CATALOG_NON_INTERACTIVE=1
WORKDIR /app

RUN apt-get update && apt-get install -y pkg-config cmake wget git file ca-certificates patch && npm install -g @webos-tools/cli

RUN wget -qO- "https://github.com/openlgtv/buildroot-nc4/releases/latest/download/arm-webos-linux-gnueabi_sdk-buildroot-x86_64.tar.gz" | tar -xzf - && chmod +x arm-webos-linux-gnueabi_sdk-buildroot/relocate-sdk.sh && arm-webos-linux-gnueabi_sdk-buildroot/relocate-sdk.sh

COPY . .

RUN cmake -B build/webos -S . -DCMAKE_TOOLCHAIN_FILE=arm-webos-linux-gnueabi_sdk-buildroot/share/buildroot/toolchainfile.cmake -DSE_CLOUDVARS=ON -DWEBOS=ON -DSE_RENDERER=sdl2 -DSE_BUNDLE=ON -DSE_APP_NAME=__SE_APP_NAME__ -DSE_APP_AUTHOR=__SE_APP_AUTHOR__ -DSE_APP_DESCRIPTION=__SE_APP_DESCRIPTION__ -DSE_APP_VERSION=__SE_APP_VERSION__ -DSE_APP_TITLEID=__SE_APP_TITLEID__ && cmake --build build/webos && make -C build/webos package

COPY --from=toolkitctx capture-toolkit.sh /capture-toolkit.sh
RUN EXTRA_TOOLCHAIN_DIRS=/app/arm-webos-linux-gnueabi_sdk-buildroot sh /capture-toolkit.sh /app /app/build/webos

FROM scratch AS exporter
COPY --from=main_builder /toolkit /
