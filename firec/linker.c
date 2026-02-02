#define _POSIX_C_SOURCE 200809L
#include "linker.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <stdint.h>

typedef struct {
    char *name;
    int64_t byte_idx;
} LinkLocation;

typedef struct {
    LinkLocation *locations;
    int count;
    int capacity;
} LocationList;

static void add_location(LocationList *list, const char *name, int64_t byte_idx) {
    if (list->count >= list->capacity) {
        list->capacity = list->capacity == 0 ? 16 : list->capacity * 2;
        list->locations = realloc(list->locations, list->capacity * sizeof(LinkLocation));
    }
    list->locations[list->count].name = strdup(name);
    list->locations[list->count].byte_idx = byte_idx;
    list->count++;
}

static LinkLocation *find_symbol(LocationList *symbols, const char *name) {
    for (int i = 0; i < symbols->count; i++) {
        if (strcmp(symbols->locations[i].name, name) == 0) {
            return &symbols->locations[i];
        }
    }
    return NULL;
}

// Write 64-bit value in little-endian format
static void write_uint64_le(unsigned char *buf, uint64_t value) {
    buf[0] = (value >> 0) & 0xFF;
    buf[1] = (value >> 8) & 0xFF;
    buf[2] = (value >> 16) & 0xFF;
    buf[3] = (value >> 24) & 0xFF;
    buf[4] = (value >> 32) & 0xFF;
    buf[5] = (value >> 40) & 0xFF;
    buf[6] = (value >> 48) & 0xFF;
    buf[7] = (value >> 56) & 0xFF;
}

unsigned char *link_bytecode(const char *encoded, size_t *output_size) {
    LocationList symbols = {NULL, 0, 0};
    LocationList link_locs = {NULL, 0, 0};
    
    unsigned char *buffer = NULL;
    size_t buffer_size = 0;
    size_t buffer_capacity = 0;
    int64_t byte_idx = 0;
    
    // Parse encoded bytecode line by line
    char *code_copy = strdup(encoded);
    char *saveptr;
    char *line = strtok_r(code_copy, "\n", &saveptr);
    
    while (line) {
        // Trim whitespace
        while (*line && isspace(*line)) line++;
        if (*line == '\0') {
            line = strtok_r(NULL, "\n", &saveptr);
            continue;
        }
        
        // Remove comments
        char *comment = strchr(line, ';');
        if (comment) {
            *comment = '\0';
            // Trim trailing whitespace
            while (comment > line && isspace(*(comment - 1))) {
                comment--;
                *comment = '\0';
            }
        }
        
        // Skip empty lines after trimming
        if (*line == '\0') {
            line = strtok(NULL, "\n");
            continue;
        }
        
        // Handle directives
        if (line[0] == '[') {
            // Ignore org directives
        }
        else if (strchr(line, ':') && strchr(line, ':') == (line + strlen(line) - 1)) {
            // Symbol definition
            char symbol_name[256];
            sscanf(line, "%[^:]", symbol_name);
            add_location(&symbols, symbol_name, byte_idx);
        }
        else if (strncmp(line, "db ", 3) == 0) {
            // Byte data
            char *data = line + 3;
            while (*data && isspace(*data)) data++;
            
            // Make a copy for strtok
            char *data_copy = strdup(data);
            char *token = strtok(data_copy, ",");
            while (token) {
                while (*token && isspace(*token)) token++;
                
                // Check if it's a string
                if (token[0] == '"' && token[strlen(token) - 1] == '"') {
                    // String literal
                    for (size_t i = 1; i < strlen(token) - 1; i++) {
                        if (buffer_size >= buffer_capacity) {
                            buffer_capacity = buffer_capacity == 0 ? 1024 : buffer_capacity * 2;
                            buffer = realloc(buffer, buffer_capacity);
                        }
                        buffer[buffer_size++] = token[i];
                        byte_idx++;
                    }
                } else {
                    // Numeric value
                    int value = atoi(token);
                    if (buffer_size >= buffer_capacity) {
                        buffer_capacity = buffer_capacity == 0 ? 1024 : buffer_capacity * 2;
                        buffer = realloc(buffer, buffer_capacity);
                    }
                    buffer[buffer_size++] = (unsigned char)value;
                    byte_idx++;
                }
                
                token = strtok(NULL, ",");
            }
            free(data_copy);
        }
        else if (strncmp(line, "dq ", 3) == 0) {
            // Quad-word (64-bit) data
            char *data = line + 3;
            while (*data && isspace(*data)) data++;
            
            // Parse comma-separated values
            char *data_copy = strdup(data);
            char *token = strtok(data_copy, ",");
            while (token) {
                while (*token && isspace(*token)) token++;
                
                // Check if it's a symbol reference
                if (!isdigit(*token) && *token != '-') {
                    // Symbol reference - add to link locations
                    add_location(&link_locs, token, byte_idx);
                    
                    // Reserve 8 bytes (will be filled later)
                    if (buffer_size + 8 > buffer_capacity) {
                        buffer_capacity = buffer_capacity == 0 ? 1024 : buffer_capacity * 2;
                        while (buffer_size + 8 > buffer_capacity) {
                            buffer_capacity *= 2;
                        }
                        buffer = realloc(buffer, buffer_capacity);
                    }
                    memset(buffer + buffer_size, 0, 8);
                    buffer_size += 8;
                    byte_idx += 8;
                } else {
                    // Numeric value
                    int64_t value = atoll(token);
                    if (buffer_size + 8 > buffer_capacity) {
                        buffer_capacity = buffer_capacity == 0 ? 1024 : buffer_capacity * 2;
                        while (buffer_size + 8 > buffer_capacity) {
                            buffer_capacity *= 2;
                        }
                        buffer = realloc(buffer, buffer_capacity);
                    }
                    write_uint64_le(buffer + buffer_size, (uint64_t)value);
                    buffer_size += 8;
                    byte_idx += 8;
                }
                
                token = strtok(NULL, ",");
            }
            free(data_copy);
        }
        
        line = strtok_r(NULL, "\n", &saveptr);
    }
    
    free(code_copy);
    
    // Resolve link locations
    for (int i = 0; i < link_locs.count; i++) {
        LinkLocation *symbol = find_symbol(&symbols, link_locs.locations[i].name);
        if (!symbol) {
            fprintf(stderr, "Error: Symbol not found: %s\n", link_locs.locations[i].name);
            // Continue anyway, leave as zeros
            continue;
        }
        
        // Write symbol address at link location
        write_uint64_le(buffer + link_locs.locations[i].byte_idx, (uint64_t)symbol->byte_idx);
    }
    
    // Cleanup
    for (int i = 0; i < symbols.count; i++) {
        free(symbols.locations[i].name);
    }
    free(symbols.locations);
    
    for (int i = 0; i < link_locs.count; i++) {
        free(link_locs.locations[i].name);
    }
    free(link_locs.locations);
    
    *output_size = buffer_size;
    return buffer;
}
