FROM gradylink/pacbrew:latest AS main_builder
ENV CATALOG_NON_INTERACTIVE=1
WORKDIR /app

COPY . .

RUN cmake -B build-ps4 -DCMAKE_TOOLCHAIN_FILE=cmake/toolchains/ps4.cmake -DCMAKE_BUILD_TYPE=Release -DSE_BUNDLE=ON -DSE_APP_NAME=__SE_APP_NAME__ -DSE_APP_AUTHOR=__SE_APP_AUTHOR__ -DSE_APP_DESCRIPTION=__SE_APP_DESCRIPTION__ -DSE_APP_VERSION=__SE_APP_VERSION__ -DSE_APP_TITLEID=ABCD12345 && cmake --build build-ps4 -j2

COPY --from=toolkitctx capture-toolkit.sh /capture-toolkit.sh
RUN sh /capture-toolkit.sh /app /app/build-ps4

FROM scratch AS exporter
COPY --from=main_builder /toolkit /
