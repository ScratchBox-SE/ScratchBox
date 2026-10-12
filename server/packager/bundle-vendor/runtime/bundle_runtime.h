#ifndef BUNDLE_RUNTIME_H
#define BUNDLE_RUNTIME_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct bundle_archive {
  const unsigned char *data;
  size_t size;
} bundle_archive;

typedef struct bundle_entry {
  const bundle_archive *archive;
  size_t name_offset; /** byte offset of the (non-NULL-terminated) name */
  size_t name_length;
  size_t local_header_offset;
  size_t compressed_size;
  size_t uncompressed_size;
  unsigned int crc32;
  unsigned short method; /** BUNDLE_METHOD_STORE or BUNDLE_METHOD_DEFLATE */
} bundle_entry;

enum { BUNDLE_METHOD_STORE = 0, BUNDLE_METHOD_DEFLATE = 8 };

enum {
  BUNDLE_OK = 0,
  BUNDLE_ERROR_NOT_FOUND = -1,
  BUNDLE_ERROR_CORRUPT = -2,
  BUNDLE_ERROR_UNSUPPORTED = -3,
  BUNDLE_ERROR_OUT_OF_MEMORY = -4,
  BUNDLE_ERROR_BUFFER_TOO_SMALL = -5
};

int bundle_find(const bundle_archive *archive, const char *path, bundle_entry *out);

typedef struct bundle_iterator {
  const bundle_archive *archive;
  const unsigned char *cursor;
  size_t remaining;
} bundle_iterator;
int bundle_iter_begin(const bundle_archive *archive, bundle_iterator *it);
int bundle_iter_next(bundle_iterator *it, bundle_entry *out);
long bundle_entry_count(const bundle_archive *archive);

size_t bundle_entry_name(const bundle_entry *entry, char *buf, size_t buf_size);
size_t bundle_entry_size(const bundle_entry *entry);

typedef struct bundle_stream {
  const bundle_entry *entry;
  const unsigned char *cursor;
  size_t remaining_compressed;
  size_t remaining_uncompressed;
  void *codec_state;
  int status;
  unsigned char window[32768];
  size_t window_start;
  size_t window_avail;
  size_t dict_pos;
} bundle_stream;

/** @return BUNDLE_OK or BUNDLE_ERROR_* */
int bundle_open(const bundle_entry *entry, bundle_stream *stream);

/** @return Number of read bytes. */
size_t bundle_read(bundle_stream *stream, void *buf, size_t max_len);

/** @return BUNDLE_OK or BUNDLE_ERROR_* */
int bundle_stream_status(const bundle_stream *stream);

void bundle_close(bundle_stream *stream);

/** @return Number of written bytes or BUNDLE_ERROR_* */
long bundle_read_all(const bundle_entry *entry, void *buf, size_t buf_size);

void *bundle_load(const bundle_entry *entry, size_t *out_size);

#ifdef __cplusplus
}
#endif

#endif
