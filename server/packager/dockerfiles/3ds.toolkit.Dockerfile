FROM debian:bookworm AS makerom_installer
WORKDIR /makerom
RUN apt-get update && apt-get install -y --no-install-recommends build-essential git ca-certificates
RUN git clone --recurse-submodules https://github.com/3DSGuy/Project_CTR.git . && cd makerom && make deps && make
RUN mkdir -p /makerom_out && cp makerom/bin/makerom /makerom_out/makerom

FROM debian:bookworm AS bannertool_builder
WORKDIR /bannertool
RUN apt update && apt install -y --no-install-recommends build-essential git ca-certificates cmake
RUN git clone https://github.com/carstene1ns/3ds-bannertool.git . && git checkout 3767e03b0492654bdff7be7beacf32b5b6a60415 && cmake -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build

FROM devkitpro/devkitarm:latest AS main_builder
ENV CATALOG_NON_INTERACTIVE=1
WORKDIR /app

COPY --from=makerom_installer /makerom_out/ /makerom/
COPY --from=bannertool_builder /bannertool/ /bannertool/
COPY . .

RUN /opt/devkitpro/portlibs/3ds/bin/arm-none-eabi-cmake -B build-3ds -DCMAKE_BUILD_TYPE=Release -DSE_MAKEROM=/makerom/makerom -DSE_BANNERTOOL=/bannertool/build/bannertool -DSE_BUNDLE=ON -DSE_APP_NAME=__SE_APP_NAME__ -DSE_APP_AUTHOR=__SE_APP_AUTHOR__ -DSE_APP_DESCRIPTION=__SE_APP_DESCRIPTION__ -DSE_APP_VERSION=__SE_APP_VERSION__ -DSE_APP_TITLEID=__SE_APP_TITLEID__ && cmake --build build-3ds -j2

COPY --from=toolkitctx capture-toolkit.sh /capture-toolkit.sh
RUN sh /capture-toolkit.sh /app /app/build-3ds

FROM scratch AS exporter
COPY --from=main_builder /toolkit /
