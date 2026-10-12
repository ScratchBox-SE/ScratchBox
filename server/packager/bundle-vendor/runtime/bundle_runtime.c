#include "bundle_runtime.h"

#include <stdlib.h>
#include <string.h>

#if defined(BUNDLE_USE_ZLIB)
#include <zlib.h>
#else
#include <miniz.h>
#endif

static unsigned int bundle__le16(const unsigned char *p) { return (unsigned int)p[0] | ((unsigned int)p[1] << 8); }

static unsigned long bundle__le32(const unsigned char *p) {
  return (unsigned long)p[0] | ((unsigned long)p[1] << 8) | ((unsigned long)p[2] << 16) | ((unsigned long)p[3] << 24);
}

#define BUNDLE__EOCD_SIG 0x06054b50UL
#define BUNDLE__CD_SIG 0x02014b50UL
#define BUNDLE__EOCD_FIXED_SIZE 22
#define BUNDLE__CD_FIXED_SIZE 46

static int bundle__find_eocd(const bundle_archive *archive, const unsigned char **out) {
  size_t size = archive->size;
  const unsigned char *data = archive->data;
  size_t scan_start, i;

  if (size < BUNDLE__EOCD_FIXED_SIZE) {
    return BUNDLE_ERROR_CORRUPT;
  }

  scan_start = size - BUNDLE__EOCD_FIXED_SIZE;
  for (i = scan_start;; --i) {
    if (bundle__le32(data + i) == BUNDLE__EOCD_SIG) {
      size_t comment_len = bundle__le16(data + i + 20);
      if (i + BUNDLE__EOCD_FIXED_SIZE + comment_len == size) {
        *out = data + i;
        return BUNDLE_OK;
      }
    }
    if (i == 0 || scan_start - i >= 65535) {
      break;
    }
  }

  return BUNDLE_ERROR_CORRUPT;
}

static int bundle__locate_central_directory(const bundle_archive *archive, const unsigned char **cd_start, size_t *entry_count) {
  const unsigned char *eocd;
  unsigned long disk_entries, total_entries, cd_size, cd_offset;
  int rc;

  if (!archive || !archive->data) {
    return BUNDLE_ERROR_CORRUPT;
  }

  rc = bundle__find_eocd(archive, &eocd);
  if (rc != BUNDLE_OK) {
    return rc;
  }

  disk_entries = bundle__le16(eocd + 8);
  total_entries = bundle__le16(eocd + 10);
  cd_size = bundle__le32(eocd + 12);
  cd_offset = bundle__le32(eocd + 16);

  if (disk_entries != total_entries || disk_entries == 0xFFFFUL || cd_offset == 0xFFFFFFFFUL) {
    return BUNDLE_ERROR_UNSUPPORTED;
  }

  if ((unsigned long)archive->size < cd_offset || (unsigned long)archive->size - cd_offset < cd_size) {
    return BUNDLE_ERROR_CORRUPT;
  }

  *cd_start = archive->data + cd_offset;
  *entry_count = (size_t)total_entries;
  return BUNDLE_OK;
}

int bundle_iter_begin(const bundle_archive *archive, bundle_iterator *it) {
  const unsigned char *cd_start;
  size_t entry_count;
  int rc = bundle__locate_central_directory(archive, &cd_start, &entry_count);
  if (rc != BUNDLE_OK) {
    return rc;
  }
  it->archive = archive;
  it->cursor = cd_start;
  it->remaining = entry_count;
  return BUNDLE_OK;
}

int bundle_iter_next(bundle_iterator *it, bundle_entry *out) {
  const unsigned char *p, *archive_end;
  size_t record_len, name_len, extra_len, comment_len;
  unsigned long disk_start;

  if (it->remaining == 0) {
    return 0;
  }

  p = it->cursor;
  archive_end = it->archive->data + it->archive->size;

  if (archive_end - p < BUNDLE__CD_FIXED_SIZE || bundle__le32(p) != BUNDLE__CD_SIG) {
    return BUNDLE_ERROR_CORRUPT;
  }

  disk_start = bundle__le16(p + 34);
  if (disk_start != 0) {
    return BUNDLE_ERROR_UNSUPPORTED;
  }

  name_len = bundle__le16(p + 28);
  extra_len = bundle__le16(p + 30);
  comment_len = bundle__le16(p + 32);
  record_len = (size_t)BUNDLE__CD_FIXED_SIZE + name_len + extra_len + comment_len;

  if ((size_t)(archive_end - p) < record_len) {
    return BUNDLE_ERROR_CORRUPT;
  }

  out->archive = it->archive;
  out->method = (unsigned short)bundle__le16(p + 10);
  out->crc32 = (unsigned int)bundle__le32(p + 16);
  out->compressed_size = (size_t)bundle__le32(p + 20);
  out->uncompressed_size = (size_t)bundle__le32(p + 24);
  out->local_header_offset = (size_t)bundle__le32(p + 42);
  out->name_length = name_len;
  out->name_offset = (size_t)((p + BUNDLE__CD_FIXED_SIZE) - it->archive->data);

  if (out->compressed_size == 0xFFFFFFFFUL || out->uncompressed_size == 0xFFFFFFFFUL || out->local_header_offset == 0xFFFFFFFFUL) {
    return BUNDLE_ERROR_UNSUPPORTED;
  }

  it->cursor = p + record_len;
  it->remaining -= 1;
  return 1;
}

int bundle_find(const bundle_archive *archive, const char *path, bundle_entry *out) {
  bundle_iterator it;
  bundle_entry entry;
  size_t path_len = strlen(path);
  int rc = bundle_iter_begin(archive, &it);
  if (rc != BUNDLE_OK) {
    return rc;
  }

  for (;;) {
    rc = bundle_iter_next(&it, &entry);
    if (rc == 0) {
      return BUNDLE_ERROR_NOT_FOUND;
    }
    if (rc < 0) {
      return rc;
    }
    if (entry.name_length == path_len && memcmp(archive->data + entry.name_offset, path, path_len) == 0) {
      *out = entry;
      return BUNDLE_OK;
    }
  }
}

long bundle_entry_count(const bundle_archive *archive) {
  const unsigned char *cd_start;
  size_t entry_count;
  int rc = bundle__locate_central_directory(archive, &cd_start, &entry_count);
  if (rc != BUNDLE_OK) {
    return (long)rc;
  }
  return (long)entry_count;
}

size_t bundle_entry_name(const bundle_entry *entry, char *buf, size_t buf_size) {
  const char *name = (const char *)(entry->archive->data + entry->name_offset);
  if (buf_size > 0) {
    size_t copy_len = entry->name_length < buf_size - 1 ? entry->name_length : buf_size - 1;
    memcpy(buf, name, copy_len);
    buf[copy_len] = '\0';
  }
  return entry->name_length;
}

size_t bundle_entry_size(const bundle_entry *entry) { return entry->uncompressed_size; }

#if defined(BUNDLE_USE_ZLIB)

static int bundle__codec_open(bundle_stream *stream) {
  z_stream *zs = (z_stream *)malloc(sizeof(z_stream));
  if (!zs) {
    return BUNDLE_ERROR_OUT_OF_MEMORY;
  }
  memset(zs, 0, sizeof(*zs));
  if (inflateInit2(zs, -15) != Z_OK) {
    free(zs);
    return BUNDLE_ERROR_CORRUPT;
  }
  stream->codec_state = zs;
  return BUNDLE_OK;
}

static long bundle__codec_fill(bundle_stream *stream) {
  z_stream *zs = (z_stream *)stream->codec_state;
  int rc;

  if (stream->remaining_uncompressed == 0) {
    return 0;
  }

  zs->next_in = (Bytef *)stream->cursor;
  zs->avail_in = (uInt)stream->remaining_compressed;
  zs->next_out = (Bytef *)stream->window;
  zs->avail_out = (uInt)sizeof(stream->window);

  rc = inflate(zs, Z_NO_FLUSH);

  stream->cursor += stream->remaining_compressed - zs->avail_in;
  stream->remaining_compressed = zs->avail_in;

  if (rc != Z_OK && rc != Z_STREAM_END) {
    return BUNDLE_ERROR_CORRUPT;
  }

  return (long)(sizeof(stream->window) - zs->avail_out);
}

static void bundle__codec_close(bundle_stream *stream) {
  if (stream->codec_state) {
    inflateEnd((z_stream *)stream->codec_state);
    free(stream->codec_state);
    stream->codec_state = NULL;
  }
}

#else

static int bundle__codec_open(bundle_stream *stream) {
  tinfl_decompressor *decomp = (tinfl_decompressor *)malloc(sizeof(tinfl_decompressor));
  if (!decomp) {
    return BUNDLE_ERROR_OUT_OF_MEMORY;
  }
  tinfl_init(decomp);
  stream->codec_state = decomp;
  return BUNDLE_OK;
}

static long bundle__codec_fill(bundle_stream *stream) {
  tinfl_decompressor *decomp = (tinfl_decompressor *)stream->codec_state;
  size_t in_bytes, out_bytes;
  tinfl_status status;
  unsigned int flags = 0;

  if (stream->remaining_uncompressed == 0) {
    return 0;
  }

  in_bytes = stream->remaining_compressed;
  out_bytes = sizeof(stream->window) - stream->dict_pos;

  status = tinfl_decompress(decomp, stream->cursor, &in_bytes, stream->window, stream->window + stream->dict_pos, &out_bytes, flags);

  stream->cursor += in_bytes;
  stream->remaining_compressed -= in_bytes;

  if (status < 0) {
    return BUNDLE_ERROR_CORRUPT;
  }
  if (status == TINFL_STATUS_NEEDS_MORE_INPUT && out_bytes == 0) {
    return BUNDLE_ERROR_CORRUPT;
  }

  stream->window_start = stream->dict_pos;
  stream->dict_pos = (stream->dict_pos + out_bytes) % sizeof(stream->window);

  return (long)out_bytes;
}

static void bundle__codec_close(bundle_stream *stream) {
  if (stream->codec_state) {
    free(stream->codec_state);
    stream->codec_state = NULL;
  }
}

#endif

int bundle_open(const bundle_entry *entry, bundle_stream *stream) {
  const unsigned char *local_header;
  size_t name_len, extra_len, data_offset;
  const bundle_archive *archive = entry->archive;

  memset(stream, 0, sizeof(*stream));
  stream->entry = entry;
  stream->status = BUNDLE_OK;

  if (entry->method != BUNDLE_METHOD_STORE && entry->method != BUNDLE_METHOD_DEFLATE) {
    stream->status = BUNDLE_ERROR_UNSUPPORTED;
    return stream->status;
  }

  if (entry->local_header_offset + 30 > archive->size) {
    stream->status = BUNDLE_ERROR_CORRUPT;
    return stream->status;
  }
  local_header = archive->data + entry->local_header_offset;
  if (bundle__le32(local_header) != 0x04034b50UL) {
    stream->status = BUNDLE_ERROR_CORRUPT;
    return stream->status;
  }
  name_len = bundle__le16(local_header + 26);
  extra_len = bundle__le16(local_header + 28);
  data_offset = entry->local_header_offset + 30 + name_len + extra_len;

  if (data_offset > archive->size || archive->size - data_offset < entry->compressed_size) {
    stream->status = BUNDLE_ERROR_CORRUPT;
    return stream->status;
  }

  stream->cursor = archive->data + data_offset;
  stream->remaining_compressed = entry->compressed_size;
  stream->remaining_uncompressed = entry->uncompressed_size;

  if (entry->method == BUNDLE_METHOD_DEFLATE) {
    int rc = bundle__codec_open(stream);
    if (rc != BUNDLE_OK) {
      stream->status = rc;
      return rc;
    }
  }

  return BUNDLE_OK;
}

size_t bundle_read(bundle_stream *stream, void *out, size_t max_len) {
  unsigned char *buf = (unsigned char *)out;
  size_t written = 0;

  if (stream->status != BUNDLE_OK) {
    return 0;
  }

  while (written < max_len) {
    if (stream->window_avail > 0) {
      size_t n = stream->window_avail < (max_len - written) ? stream->window_avail : (max_len - written);
      memcpy(buf + written, stream->window + stream->window_start, n);
      stream->window_start += n;
      stream->window_avail -= n;
      written += n;
      continue;
    }

    if (stream->remaining_uncompressed == 0) {
      break;
    }

    if (stream->entry->method == BUNDLE_METHOD_STORE) {
      size_t n = max_len - written;
      if (n > stream->remaining_compressed) {
        n = stream->remaining_compressed;
      }
      if (n > stream->remaining_uncompressed) {
        n = stream->remaining_uncompressed;
      }
      if (n == 0) {
        stream->status = BUNDLE_ERROR_CORRUPT;
        break;
      }
      memcpy(buf + written, stream->cursor, n);
      stream->cursor += n;
      stream->remaining_compressed -= n;
      stream->remaining_uncompressed -= n;
      written += n;
      continue;
    }

    {
      long produced = bundle__codec_fill(stream);
      if (produced < 0) {
        stream->status = (int)produced;
        break;
      }
      if (produced == 0) {
        stream->status = BUNDLE_ERROR_CORRUPT;
        break;
      }
      if ((size_t)produced > stream->remaining_uncompressed) {
        produced = (long)stream->remaining_uncompressed;
      }
      stream->window_avail = (size_t)produced;
      stream->remaining_uncompressed -= (size_t)produced;
    }
  }

  return written;
}

int bundle_stream_status(const bundle_stream *stream) { return stream->status; }

void bundle_close(bundle_stream *stream) {
  if (stream->entry && stream->entry->method == BUNDLE_METHOD_DEFLATE) {
    bundle__codec_close(stream);
  }
  stream->entry = NULL;
}

long bundle_read_all(const bundle_entry *entry, void *buf, size_t buf_size) {
  bundle_stream stream;
  size_t total = 0;
  int rc;

  if (buf_size < entry->uncompressed_size) {
    return BUNDLE_ERROR_BUFFER_TOO_SMALL;
  }

  rc = bundle_open(entry, &stream);
  if (rc != BUNDLE_OK) {
    return rc;
  }

  while (total < entry->uncompressed_size) {
    size_t n = bundle_read(&stream, (unsigned char *)buf + total, entry->uncompressed_size - total);
    if (n == 0) {
      break;
    }
    total += n;
  }

  rc = bundle_stream_status(&stream);
  bundle_close(&stream);

  if (rc != BUNDLE_OK) {
    return rc;
  }
  if (total != entry->uncompressed_size) {
    return BUNDLE_ERROR_CORRUPT;
  }
  return (long)total;
}

void *bundle_load(const bundle_entry *entry, size_t *out_size) {
  void *buf;
  long rc;

  if (out_size) {
    *out_size = entry->uncompressed_size;
  }

  buf = malloc(entry->uncompressed_size > 0 ? entry->uncompressed_size : 1);
  if (!buf) {
    return NULL;
  }

  rc = bundle_read_all(entry, buf, entry->uncompressed_size);
  if (rc < 0) {
    free(buf);
    return NULL;
  }
  return buf;
}
