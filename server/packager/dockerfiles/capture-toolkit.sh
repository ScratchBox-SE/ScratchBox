#!/bin/sh
set -e

TOOLKIT_OUT="${TOOLKIT_OUT:-/toolkit}"
mkdir -p "$TOOLKIT_OUT/objects"

CONTAINER_ROOT="$1"
shift
BUILD_DIRS="$*"

is_bundle_path() {
  case "$1" in
    *bundle/se_project*|*se_project_data*|*se_project_archive*|*libse_project.a*) return 0 ;;
    *bundle/se_assets*|*se_assets_data*|*se_assets_archive*|*libse_assets.a*) return 0 ;;
    *) return 1 ;;
  esac
}

ROMFS_DIR="$CONTAINER_ROOT/romfs"
[ -d "$ROMFS_DIR/gfx" ] && cp -r "$ROMFS_DIR/gfx" "$TOOLKIT_OUT/gfx"
[ -d "$ROMFS_DIR/extensions" ] && cp -r "$ROMFS_DIR/extensions" "$TOOLKIT_OUT/extensions"

for BUILD_DIR in "$@"; do
  [ -d "$BUILD_DIR" ] || continue

  find "$BUILD_DIR" \( -name '*.o' -o -name '*.obj' -o -name '*.a' -o -name '*.rsp' -o -name 'CPack*.cmake' -o -name 'cmake_install.cmake' \) | while IFS= read -r f; do
    is_bundle_path "$f" && continue
    rel=$(echo "$f" | sed "s#^$BUILD_DIR/##")
    dest="$TOOLKIT_OUT/objects/$(basename "$BUILD_DIR")/$rel"
    mkdir -p "$(dirname "$dest")"
    cp "$f" "$dest"
  done

  mkdir -p "$TOOLKIT_OUT/cmake/$(basename "$BUILD_DIR")"
  cp -f "$BUILD_DIR/CMakeCache.txt" "$TOOLKIT_OUT/cmake/$(basename "$BUILD_DIR")/CMakeCache.txt" 2>/dev/null || true
  cp -f "$BUILD_DIR/Makefile" "$TOOLKIT_OUT/cmake/$(basename "$BUILD_DIR")/Makefile" 2>/dev/null || true
  cp -f "$BUILD_DIR/CMakeFiles/Makefile2" "$TOOLKIT_OUT/cmake/$(basename "$BUILD_DIR")/Makefile2" 2>/dev/null || true

  find "$BUILD_DIR/CMakeFiles" -maxdepth 1 -type d -name '*.dir' 2>/dev/null | while IFS= read -r d; do
    name=$(basename "$d")
    dest="$TOOLKIT_OUT/cmake/$(basename "$BUILD_DIR")/CMakeFiles/$name"
    mkdir -p "$dest"
    cp -f "$d"/link.txt "$dest/" 2>/dev/null || true
    cp -f "$d"/build.make "$dest/" 2>/dev/null || true
    cp -f "$d"/flags.make "$dest/" 2>/dev/null || true
  done
done

for TOOLCHAIN_DIR in $EXTRA_TOOLCHAIN_DIRS; do
  [ -d "$TOOLCHAIN_DIR" ] || continue
  dest="$TOOLKIT_OUT/abs$TOOLCHAIN_DIR"
  rm -rf "$dest"
  mkdir -p "$(dirname "$dest")"
  cp -r "$TOOLCHAIN_DIR" "$dest"
  echo "$TOOLCHAIN_DIR" >> "$TOOLKIT_OUT/toolchain-dirs.txt"
done

mirror_abs_path() {
  p="$1"
  case "$p" in *[!/]*) ;; *) return 0 ;; esac
  [ -f "$p" ] || [ -d "$p" ] || return 0
  case "$p" in /usr/*|/lib/*|/bin/*|/sbin/*) return 0 ;; esac
  for BUILD_DIR in $BUILD_DIRS; do
    case "$p" in
      "$BUILD_DIR")
        return 0
        ;;
      "$BUILD_DIR"/*)
        [ -f "$p" ] || return 0
        rel="${p#"$BUILD_DIR"/}"
        dest="$TOOLKIT_OUT/objects/$(basename "$BUILD_DIR")/$rel"
        [ -e "$dest" ] && return 0
        mkdir -p "$(dirname "$dest")"
        cp "$p" "$dest"
        return 0
        ;;
    esac
  done
  dest="$TOOLKIT_OUT/abs$p"
  [ -e "$dest" ] && return 0
  mkdir -p "$(dirname "$dest")"
  if [ -d "$p" ]; then
    cp -r "$p" "$dest"
  else
    cp "$p" "$dest"
  fi
}

mirror_abs_paths_in_line() {
  printf '%s' "$1" | tr -s ' \t"=' '\n' | grep '^/' | while IFS= read -r p; do
    mirror_abs_path "$p"
  done
}

find "$TOOLKIT_OUT/cmake" -name 'link.txt' 2>/dev/null | while IFS= read -r f; do
  mirror_abs_paths_in_line "$(cat "$f")"
done

TAB="$(printf '\t')"
find "$TOOLKIT_OUT/cmake" -name 'build.make' 2>/dev/null | while IFS= read -r f; do
  skip=0
  while IFS= read -r line; do
    case "$line" in
      "$TAB"*)
        [ "$skip" = "1" ] && continue
        case "$line" in
          *'$(CXX_FLAGS)'*|*'$(C_FLAGS)'*|*'$(ASM_FLAGS)'*) continue ;;
        esac
        case "$line" in *cmake_echo_color*) continue ;; esac
        mirror_abs_paths_in_line "$line"
        ;;
      *)
        header="${line%%:*}"
        case "$header" in
          *.dir/clean|*.dir/depend|*.dir/codegen|*.dir/build|*.dir/progress|*.i|*.s) skip=1 ;;
          *) skip=0 ;;
        esac
        ;;
    esac
  done < "$f"
done

find "$TOOLKIT_OUT/objects" -name '*.rc' 2>/dev/null | while IFS= read -r f; do
  mirror_abs_paths_in_line "$(cat "$f")"
done

find "$TOOLKIT_OUT/objects" -name 'CPack*.cmake' -o -name 'cmake_install.cmake' 2>/dev/null | while IFS= read -r f; do
  mirror_abs_paths_in_line "$(cat "$f")"
done

