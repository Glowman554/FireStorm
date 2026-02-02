#include "stringbuilder.h"

#include <stdlib.h>
#include <string.h>

StringBuilder* sb_new() {
    StringBuilder* sb = malloc(sizeof(StringBuilder));
    sb->capacity = INITIAL_BUFFER_SIZE;
    sb->size = 0;
    sb->buffer = malloc(sb->capacity);
    sb->buffer[0] = '\0';
    return sb;
}

void sb_append(StringBuilder* sb, const char* str) {
    size_t len = strlen(str);
    while (sb->size + len + 1 > sb->capacity) {
        sb->capacity *= 2;
        sb->buffer = realloc(sb->buffer, sb->capacity);
    }
    strcpy(sb->buffer + sb->size, str);
    sb->size += len;
}

char* sb_to_string(StringBuilder* sb) {
    char* result = strdup(sb->buffer);
    free(sb->buffer);
    free(sb);
    return result;
}
