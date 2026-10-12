FROM gcc:14 AS main_builder
ENV CATALOG_NON_INTERACTIVE=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential cmake libmbedtls-dev libdbus-1-dev libpulse-dev libgl1-mesa-dev libgl1-mesa-dri libglx-mesa0 libegl1-mesa-dev python3-jinja2 libx11-dev libxcursor-dev libxi-dev libxrandr-dev libxinerama-dev libxss-dev libxtst-dev libwayland-dev libxkbcommon-dev wayland-protocols libwayland-bin

COPY . .

RUN mkdir build && cd build && cmake .. -DCMAKE_BUILD_TYPE=Release -DSE_RENDERER=opengl_core -DSE_WINDOWING=glfw -DSE_AUDIO_ENGINE=libpulse -DSE_BUNDLE=ON -DSE_APP_NAME=__SE_APP_NAME__ -DSE_APP_AUTHOR=__SE_APP_AUTHOR__ -DSE_APP_DESCRIPTION=__SE_APP_DESCRIPTION__ -DSE_APP_VERSION=__SE_APP_VERSION__ -DSE_APP_TITLEID=__SE_APP_TITLEID__ && cmake --build . -j 2

COPY --from=toolkitctx capture-toolkit.sh /capture-toolkit.sh
RUN sh /capture-toolkit.sh /app /app/build

FROM scratch AS exporter
COPY --from=main_builder /toolkit /
