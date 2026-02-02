#pragma once

#include <stddef.h>

#define INITIAL_BUFFER_SIZE 4096

typedef struct {
    char* buffer;
    size_t size;
    size_t capacity;
} StringBuilder;

StringBuilder* sb_new();
void sb_append(StringBuilder* sb, const char* str);
char* sb_to_string(StringBuilder* sb);