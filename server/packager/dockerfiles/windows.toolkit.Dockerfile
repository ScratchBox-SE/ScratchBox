FROM debian:trixie AS main_builder
ENV CATALOG_NON_INTERACTIVE=1
WORKDIR /app

RUN apt-get update && apt-get install -y mingw-w64 wget unzip git pkg-config zip cmake python3 python3-jinja2 nsis patch

COPY . .

RUN mkdir build && cd build && cmake -DCMAKE_SYSTEM_NAME=Windows -DCMAKE_C_COMPILER=x86_64-w64-mingw32-gcc -DCMAKE_CXX_COMPILER=x86_64-w64-mingw32-g++ -DSE_CLOUDVARS=ON -DSE_DOWNLOAD=ON -DCMAKE_BUILD_TYPE=Release -DSE_RENDERER=opengl_core -DSE_WINDOWING=win32 -DSE_AUDIO_ENGINE=winmm -DSE_BUNDLE=ON -DSE_APP_NAME=__SE_APP_NAME__ -DSE_APP_AUTHOR=__SE_APP_AUTHOR__ -DSE_APP_DESCRIPTION=__SE_APP_DESCRIPTION__ -DSE_APP_VERSION=__SE_APP_VERSION__ -DSE_APP_TITLEID=__SE_APP_TITLEID__ .. && cmake --build . -j2

COPY --from=toolkitctx capture-toolkit.sh /capture-toolkit.sh
RUN sh /capture-toolkit.sh /app /app/build

FROM scratch AS exporter
COPY --from=main_builder /toolkit /
