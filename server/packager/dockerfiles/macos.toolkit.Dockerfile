FROM --platform=$BUILDPLATFORM crazymax/osxcross:15.5-alpine AS osxcross

FROM alpine:latest AS main_builder
ENV CATALOG_NON_INTERACTIVE=1
WORKDIR /app

RUN apk add --no-cache clang lld musl-dev fts cmake make git bash python3 py3-jinja2 wget patch

COPY --from=osxcross /osxcross /osxcross
ENV PATH="/osxcross/bin:$PATH"
ENV LD_LIBRARY_PATH="/osxcross/lib"
ENV MACOSX_DEPLOYMENT_TARGET="14.0"

COPY . .

RUN mkdir build && cd build && x86_64-apple-darwin24.5-cmake -DCMAKE_OSX_DEPLOYMENT_TARGET=$MACOSX_DEPLOYMENT_TARGET -DSE_CLOUDVARS=OFF -DSE_DOWNLOAD=OFF -DSE_AUDIO_ENGINE=sdl2 -DSE_WINDOWING=sdl2 -DCMAKE_BUILD_TYPE=Release -DSE_BUNDLE=ON -DSE_APP_NAME=__SE_APP_NAME__ -DSE_APP_AUTHOR=__SE_APP_AUTHOR__ -DSE_APP_DESCRIPTION=__SE_APP_DESCRIPTION__ -DSE_APP_VERSION=__SE_APP_VERSION__ -DSE_APP_TITLEID=__SE_APP_TITLEID__ .. && cmake --build . -j2

COPY --from=toolkitctx capture-toolkit.sh /capture-toolkit.sh
RUN EXTRA_TOOLCHAIN_DIRS=/osxcross sh /capture-toolkit.sh /app /app/build

FROM scratch AS exporter
COPY --from=main_builder /toolkit /
