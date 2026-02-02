#ifndef LINKER_H
#define LINKER_H

#include <stddef.h>

// Link encoded bytecode to binary format
// Returns binary data and sets output_size
unsigned char *link_bytecode(const char *encoded, size_t *output_size);

#endif
