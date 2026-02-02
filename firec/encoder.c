#define _POSIX_C_SOURCE 200809L
#include "encoder.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

// String builder for efficient string concatenation
typedef struct {
    char *data;
    size_t length;
    size_t capacity;
} StringBuilder;

static StringBuilder *sb_new() {
    StringBuilder *sb = malloc(sizeof(StringBuilder));
    sb->capacity = 1024;
    sb->length = 0;
    sb->data = malloc(sb->capacity);
    sb->data[0] = '\0';
    return sb;
}

static void sb_append(StringBuilder *sb, const char *str) {
    size_t len = strlen(str);
    while (sb->length + len + 1 > sb->capacity) {
        sb->capacity *= 2;
        sb->data = realloc(sb->data, sb->capacity);
    }
    strcpy(sb->data + sb->length, str);
    sb->length += len;
}

static char *sb_to_string(StringBuilder *sb) {
    char *result = strdup(sb->data);
    free(sb->data);
    free(sb);
    return result;
}

// Instruction set
static const char *instructions[] = {
    "global_reserve",
    "assign", "assign_indexed", "load", "load_indexed",
    "number", "string",
    "goto", "goto_true", "goto_false", "invoke", "invoke_native", "return",
    "variable",
    "increase", "decrease", "add", "sub", "mul", "div", "mod",
    "less", "less_equals", "more", "more_equals", "equals", "not_equals",
    "invert",
    "shift_left", "shift_right", "or", "and", "xor", "not",
    "noreturn", "delete",
    "change_sign"
};
static const int num_instructions = sizeof(instructions) / sizeof(instructions[0]);

// Datatypes
static const char *datatypes[] = {"int", "chr", "str", "ptr", "i16", "i32"};
static const int num_datatypes = sizeof(datatypes) / sizeof(datatypes[0]);

// Native functions
static const char *natives[] = {
    "exit",
    "putchar", "puts",
    "malloc", "free",
    "fopen", "fclose", "fseek", "fread", "fwrite", "ftell"
};
static const int num_natives = sizeof(natives) / sizeof(natives[0]);

// Helper function to find index
static int find_index(const char **array, int size, const char *item) {
    for (int i = 0; i < size; i++) {
        if (strcmp(array[i], item) == 0) return i;
    }
    return -1;
}

// Global and function tracking
typedef struct {
    char **globals;
    int global_count;
    int global_capacity;
    char **functions;
    int function_count;
    int function_capacity;
} SymbolTable;

static void add_global(SymbolTable *st, const char *name) {
    if (st->global_count >= st->global_capacity) {
        st->global_capacity = st->global_capacity == 0 ? 16 : st->global_capacity * 2;
        st->globals = realloc(st->globals, st->global_capacity * sizeof(char*));
    }
    st->globals[st->global_count++] = strdup(name);
}

static void add_function(SymbolTable *st, const char *name) {
    if (st->function_count >= st->function_capacity) {
        st->function_capacity = st->function_capacity == 0 ? 16 : st->function_capacity * 2;
        st->functions = realloc(st->functions, st->function_capacity * sizeof(char*));
    }
    st->functions[st->function_count++] = strdup(name);
}

static int find_global(SymbolTable *st, const char *name) {
    return find_index((const char**)st->globals, st->global_count, name);
}

static int find_function(SymbolTable *st, const char *name) {
    return find_index((const char**)st->functions, st->function_count, name);
}

// Section info
typedef enum { SECTION_FUNCTION, SECTION_GLOBAL } SectionType;

typedef struct {
    char *name;
    char **body;
    int body_count;
    SectionType type;
} Section;

// Parse sections from code
static Section **parse_sections(const char *code, int *section_count) {
    Section **sections = NULL;
    int capacity = 0;
    *section_count = 0;
    
    Section *current = NULL;
    char *code_copy = strdup(code);
    char *line = strtok(code_copy, "\n");
    
    while (line) {
        // Trim whitespace
        while (*line && isspace(*line)) line++;
        if (*line == '\0') {
            line = strtok(NULL, "\n");
            continue;
        }
        
        if (strncmp(line, "@begin ", 7) == 0) {
            // Start new section
            current = malloc(sizeof(Section));
            current->body = NULL;
            current->body_count = 0;
            
            char type_str[64], name[256];
            sscanf(line + 7, "%s %s", type_str, name);
            current->name = strdup(name);
            current->type = strcmp(type_str, "function") == 0 ? SECTION_FUNCTION : SECTION_GLOBAL;
        } else if (strncmp(line, "@end", 4) == 0) {
            // End section
            if (current) {
                if (*section_count >= capacity) {
                    capacity = capacity == 0 ? 8 : capacity * 2;
                    sections = realloc(sections, capacity * sizeof(Section*));
                }
                sections[(*section_count)++] = current;
                current = NULL;
            }
        } else if (current) {
            // Add line to current section
            int count = current->body_count;
            current->body = realloc(current->body, (count + 1) * sizeof(char*));
            current->body[count] = strdup(line);
            current->body_count++;
        }
        
        line = strtok(NULL, "\n");
    }
    
    free(code_copy);
    return sections;
}

// Escape character
static unsigned char escape_char(char c) {
    switch (c) {
        case '"': return '"';
        case 'n': return '\n';
        case 'r': return '\r';
        case 't': return '\t';
        case 'b': return '\b';
        default: return c;
    }
}

// Translate function
static char *translate_function(Section *section, SymbolTable *st) {
    StringBuilder *sb = sb_new();
    char buffer[1024];
    
    char **locals = NULL;
    int local_count = 0;
    
    for (int i = 0; i < section->body_count; i++) {
        char *line = section->body[i];
        while (*line && isspace(*line)) line++;
        if (*line == '\0') continue;
        
        // Check for labels
        if (strchr(line, ':') && strchr(line, ':') == (line + strlen(line) - 1)) {
            snprintf(buffer, sizeof(buffer), "_%s\n", line);
            sb_append(sb, buffer);
            continue;
        }
        
        // Parse instruction
        char inst[256], arg1[256], arg2[256], arg3[256];
        inst[0] = arg1[0] = arg2[0] = arg3[0] = '\0';
        sscanf(line, "%s %s %s %s", inst, arg1, arg2, arg3);
        
        int inst_id = find_index(instructions, num_instructions, inst);
        if (inst_id == -1) {
            fprintf(stderr, "Unknown instruction: %s\n", inst);
            continue;
        }
        
        // Check if loading a function pointer
        if (strcmp(inst, "load") == 0 && find_function(st, arg1) != -1) {
            snprintf(buffer, sizeof(buffer), "\tdb %d ; %s (function pointer)\n", inst_id, line);
        } else {
            snprintf(buffer, sizeof(buffer), "\tdb %d ; %s\n", inst_id, line);
        }
        sb_append(sb, buffer);
        
        // Handle instruction-specific data
        if (strcmp(inst, "variable") == 0 || strcmp(inst, "global_reserve") == 0) {
            if (strcmp(inst, "variable") == 0) {
                locals = realloc(locals, (local_count + 1) * sizeof(char*));
                locals[local_count++] = strdup(arg1);
            }
            
            int dt_id = find_index(datatypes, num_datatypes, arg2);
            int var_id;
            int local_idx = find_index((const char**)locals, local_count, arg1);
            if (local_idx != -1) {
                var_id = local_idx;
            } else {
                int global_idx = find_global(st, arg1);
                var_id = global_idx + 256;
            }
            
            int is_array = (strcmp(arg3, "false") == 0) ? 0 : 1;
            snprintf(buffer, sizeof(buffer), "\t\tdq %d\n\t\tdb %d, %d\n", var_id, dt_id, is_array);
            sb_append(sb, buffer);
        }
        else if (strcmp(inst, "load") == 0) {
            if (find_function(st, arg1) != -1) {
                snprintf(buffer, sizeof(buffer), "\t\tdq _%s\n", arg1);
            } else {
                int local_idx = find_index((const char**)locals, local_count, arg1);
                int var_id = (local_idx != -1) ? local_idx : (find_global(st, arg1) + 256);
                snprintf(buffer, sizeof(buffer), "\t\tdq %d\n", var_id);
            }
            sb_append(sb, buffer);
        }
        else if (strcmp(inst, "assign") == 0 || strcmp(inst, "assign_indexed") == 0 || strcmp(inst, "load_indexed") == 0) {
            int local_idx = find_index((const char**)locals, local_count, arg1);
            int var_id = (local_idx != -1) ? local_idx : (find_global(st, arg1) + 256);
            snprintf(buffer, sizeof(buffer), "\t\tdq %d\n", var_id);
            sb_append(sb, buffer);
        }
        else if (strcmp(inst, "number") == 0) {
            snprintf(buffer, sizeof(buffer), "\t\tdq %s\n", arg1);
            sb_append(sb, buffer);
        }
        else if (strcmp(inst, "goto") == 0 || strcmp(inst, "goto_true") == 0 || strcmp(inst, "goto_false") == 0 || strcmp(inst, "invoke") == 0) {
            snprintf(buffer, sizeof(buffer), "\t\tdq _%s\n", arg1);
            sb_append(sb, buffer);
        }
        else if (strcmp(inst, "invoke_native") == 0) {
            int native_id = find_index(natives, num_natives, arg1);
            snprintf(buffer, sizeof(buffer), "\t\tdq %d\n", native_id);
            sb_append(sb, buffer);
        }
        else if (strcmp(inst, "string") == 0) {
            // Parse string from line
            char *start = strchr(line, '"');
            char *end = strrchr(line, '"');
            if (start && end && start != end) {
                start++;
                int len = end - start;
                
                // Process escapes
                unsigned char *output = malloc(len + 1);
                int out_idx = 0;
                for (int j = 0; j < len; j++) {
                    if (start[j] == '\\' && j + 1 < len) {
                        output[out_idx++] = escape_char(start[j + 1]);
                        j++;
                    } else {
                        output[out_idx++] = start[j];
                    }
                }
                
                snprintf(buffer, sizeof(buffer), "\t\tdq %d\n", out_idx);
                sb_append(sb, buffer);
                
                sb_append(sb, "\t\tdb ");
                for (int j = 0; j < out_idx; j++) {
                    snprintf(buffer, sizeof(buffer), "%d%s", output[j], (j < out_idx - 1) ? ", " : "");
                    sb_append(sb, buffer);
                }
                sb_append(sb, ", 0\n");
                
                free(output);
            }
        }
    }
    
    // Free locals
    for (int i = 0; i < local_count; i++) {
        free(locals[i]);
    }
    free(locals);
    
    return sb_to_string(sb);
}

// Translate global section
static char *translate_global(Section *section, SymbolTable *st) {
    // Create a function section for global initialization
    Section *init_section = malloc(sizeof(Section));
    init_section->name = strdup("global");
    init_section->type = SECTION_FUNCTION;
    init_section->body = NULL;
    init_section->body_count = 0;
    
    // Add global label
    init_section->body = realloc(init_section->body, (init_section->body_count + 1) * sizeof(char*));
    init_section->body[init_section->body_count++] = strdup("global:");
    
    // Process each global declaration
    for (int i = 0; i < section->body_count; i++) {
        char *line = section->body[i];
        while (*line && isspace(*line)) line++;
        if (*line == '\0') continue;
        
        char inst[256], name[256], type[256], value[512];
        inst[0] = name[0] = type[0] = value[0] = '\0';
        
        if (strncmp(line, "global ", 7) == 0) {
            sscanf(line, "%s %s %s %[^\n]", inst, name, type, value);
            add_global(st, name);
            
            // Add global_reserve
            char buffer[512];
            snprintf(buffer, sizeof(buffer), "global_reserve %s %s false", name, type);
            init_section->body = realloc(init_section->body, (init_section->body_count + 1) * sizeof(char*));
            init_section->body[init_section->body_count++] = strdup(buffer);
            
            // Add initializer
            if (strcmp(type, "int") == 0 || strcmp(type, "chr") == 0) {
                snprintf(buffer, sizeof(buffer), "number %s", value);
                init_section->body = realloc(init_section->body, (init_section->body_count + 1) * sizeof(char*));
                init_section->body[init_section->body_count++] = strdup(buffer);
            } else if (strcmp(type, "str") == 0) {
                // Extract string value
                char *start = strchr(line, '"');
                if (start) {
                    char *end = strrchr(line, '"');
                    if (end && end != start) {
                        int len = end - start + 1;
                        char *str_val = malloc(len + 10);
                        snprintf(str_val, len + 10, "string %.*s", len, start);
                        init_section->body = realloc(init_section->body, (init_section->body_count + 1) * sizeof(char*));
                        init_section->body[init_section->body_count++] = str_val;
                    }
                }
            }
            
            // Add assign
            snprintf(buffer, sizeof(buffer), "assign %s", name);
            init_section->body = realloc(init_section->body, (init_section->body_count + 1) * sizeof(char*));
            init_section->body[init_section->body_count++] = strdup(buffer);
        }
        else if (strncmp(line, "global_reserve ", 15) == 0) {
            sscanf(line, "%*s %s", name);
            add_global(st, name);
            init_section->body = realloc(init_section->body, (init_section->body_count + 1) * sizeof(char*));
            init_section->body[init_section->body_count++] = strdup(line);
        }
    }
    
    // Add return
    init_section->body = realloc(init_section->body, (init_section->body_count + 1) * sizeof(char*));
    init_section->body[init_section->body_count++] = strdup("number 0");
    init_section->body = realloc(init_section->body, (init_section->body_count + 1) * sizeof(char*));
    init_section->body[init_section->body_count++] = strdup("return");
    
    char *result = translate_function(init_section, st);
    
    // Free init section
    for (int i = 0; i < init_section->body_count; i++) {
        free(init_section->body[i]);
    }
    free(init_section->body);
    free(init_section->name);
    free(init_section);
    
    return result;
}

char *encode_bytecode(const char *text_bytecode) {
    // Parse sections
    int section_count;
    Section **sections = parse_sections(text_bytecode, &section_count);
    
    // Initialize symbol table
    SymbolTable st = {NULL, 0, 0, NULL, 0, 0};
    
    // Merge global sections and collect function names
    Section *merged_global = NULL;
    
    for (int i = 0; i < section_count; i++) {
        if (sections[i]->type == SECTION_GLOBAL) {
            if (!merged_global) {
                merged_global = sections[i];
            } else {
                // Merge into first global section
                for (int j = 0; j < sections[i]->body_count; j++) {
                    merged_global->body = realloc(merged_global->body, 
                        (merged_global->body_count + 1) * sizeof(char*));
                    merged_global->body[merged_global->body_count++] = sections[i]->body[j];
                }
                free(sections[i]->body);
                free(sections[i]->name);
                free(sections[i]);
                sections[i] = NULL;
            }
        } else {
            add_function(&st, sections[i]->name);
        }
    }
    
    // Build output
    StringBuilder *sb = sb_new();
    sb_append(sb, "[org 0]\n");
    sb_append(sb, "dq _spark\n");
    sb_append(sb, "dq _global\n");
    sb_append(sb, "dq _unreachable\n");
    
    // Translate sections
    for (int i = 0; i < section_count; i++) {
        if (!sections[i]) continue;
        
        char *translated;
        if (sections[i]->type == SECTION_FUNCTION) {
            translated = translate_function(sections[i], &st);
        } else {
            translated = translate_global(sections[i], &st);
        }
        
        sb_append(sb, translated);
        free(translated);
        
        // Free section
        for (int j = 0; j < sections[i]->body_count; j++) {
            free(sections[i]->body[j]);
        }
        free(sections[i]->body);
        free(sections[i]->name);
        free(sections[i]);
    }
    
    free(sections);
    
    // Free symbol table
    for (int i = 0; i < st.global_count; i++) {
        free(st.globals[i]);
    }
    free(st.globals);
    for (int i = 0; i < st.function_count; i++) {
        free(st.functions[i]);
    }
    free(st.functions);
    
    return sb_to_string(sb);
}
