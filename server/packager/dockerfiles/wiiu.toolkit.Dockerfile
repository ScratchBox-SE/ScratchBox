FROM dkosmari/devkitppc-wiiu-debian:latest AS main_builder
ENV CATALOG_NON_INTERACTIVE=1

COPY . .

RUN sudo -E /opt/devkitpro/portlibs/wiiu/bin/powerpc-eabi-cmake -B build-wiiu -DCMAKE_BUILD_TYPE=Release -DSE_BUNDLE=ON -DSE_APP_NAME=__SE_APP_NAME__ -DSE_APP_AUTHOR=__SE_APP_AUTHOR__ -DSE_APP_DESCRIPTION=__SE_APP_DESCRIPTION__ -DSE_APP_VERSION=__SE_APP_VERSION__ -DSE_APP_TITLEID=__SE_APP_TITLEID__ && sudo -E cmake --build build-wiiu -j2 && sudo -E cmake --build build-wiiu --target package_wiiu

COPY --from=toolkitctx capture-toolkit.sh /capture-toolkit.sh
RUN sudo -E sh /capture-toolkit.sh /project /project/build-wiiu

FROM scratch AS exporter
COPY --from=main_builder /toolkit /
