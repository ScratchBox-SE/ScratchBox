FROM emscripten/emsdk:latest AS main_builder
ENV CATALOG_NON_INTERACTIVE=1
WORKDIR /app

COPY . .

RUN mkdir build-wasm && cd build-wasm && emcmake cmake .. -DCMAKE_BUILD_TYPE=Release -DSE_OUTPUT_NAME=index -DSE_BUNDLE=ON -DSE_APP_NAME=__SE_APP_NAME__ -DSE_APP_AUTHOR=__SE_APP_AUTHOR__ -DSE_APP_DESCRIPTION=__SE_APP_DESCRIPTION__ -DSE_APP_VERSION=__SE_APP_VERSION__ -DSE_APP_TITLEID=__SE_APP_TITLEID__ && emmake make -j2

COPY --from=toolkitctx capture-toolkit.sh /capture-toolkit.sh
RUN sh /capture-toolkit.sh /app /app/build-wasm

FROM scratch AS exporter
COPY --from=main_builder /toolkit /
