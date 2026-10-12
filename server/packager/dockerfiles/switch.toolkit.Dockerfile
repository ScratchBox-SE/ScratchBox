FROM devkitpro/devkita64:latest AS main_builder
ENV CATALOG_NON_INTERACTIVE=1
WORKDIR /app

RUN dkp-pacman -S --noconfirm switch-glad

COPY . .

RUN cmake -DCMAKE_TOOLCHAIN_FILE=$DEVKITPRO/cmake/Switch.cmake -DSE_RENDERER=opengl_core -DSE_BUNDLE=ON -DSE_APP_NAME=__SE_APP_NAME__ -DSE_APP_AUTHOR=__SE_APP_AUTHOR__ -DSE_APP_DESCRIPTION=__SE_APP_DESCRIPTION__ -DSE_APP_VERSION=__SE_APP_VERSION__ -DSE_APP_TITLEID=__SE_APP_TITLEID__ -B build-nx && cmake --build build-nx -j2

COPY --from=toolkitctx capture-toolkit.sh /capture-toolkit.sh
RUN sh /capture-toolkit.sh /app /app/build-nx

FROM scratch AS exporter
COPY --from=main_builder /toolkit /
