#include "preprocessor.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

static char *string_duplicate(const char *str) {
    if (!str) return NULL;
    char *result = malloc(strlen(str) + 1);
    if (result) strcpy(result, str);
    return result;
}

static char *read_file(const char *filename) {
    FILE *file = fopen(filename, "r");
    if (!file) return NULL;
    
    fseek(file, 0, SEEK_END);
    long length = ftell(file);
    fseek(file, 0, SEEK_SET);
    
    char *buffer = malloc(length + 1);
    if (buffer) {
        size_t bytes_read = fread(buffer, 1, length, file);
        buffer[bytes_read] = '\0';
    }
    fclose(file);
    return buffer;
}

static int is_file_included(Preprocessor *preprocessor, const char *filename) {
    for (int i = 0; i < preprocessor->included_file_count; i++) {
        if (strcmp(preprocessor->included_files[i], filename) == 0) {
            return 1;
        }
    }
    return 0;
}

static void add_included_file(Preprocessor *preprocessor, const char *filename) {
    preprocessor->included_files = realloc(preprocessor->included_files, 
        (preprocessor->included_file_count + 1) * sizeof(char *));
    preprocessor->included_files[preprocessor->included_file_count] = string_duplicate(filename);
    preprocessor->included_file_count++;
}

static char *try_read(Preprocessor *preprocessor, const char *filename) {
    char *code = read_file(filename);
    if (code) return code;
    
    for (int i = 0; i < preprocessor->include_path_count; i++) {
        size_t path_len = strlen(preprocessor->include_paths[i]) + strlen(filename) + 2;
        char *full_path = malloc(path_len);
        snprintf(full_path, path_len, "%s%s", preprocessor->include_paths[i], filename);
        code = read_file(full_path);
        free(full_path);
        if (code) return code;
    }
    
    return NULL;
}

static char *find_pattern(const char *str, const char *pattern_start, const char *pattern_end, 
                         char **content, int *start_pos, int *end_pos) {
    char *start = strstr(str, pattern_start);
    if (!start) return NULL;
    
    *start_pos = start - str;
    char *content_start = start + strlen(pattern_start);
    char *end = strstr(content_start, pattern_end);
    if (!end) return NULL;
    
    *end_pos = end - str + strlen(pattern_end);
    
    size_t content_len = end - content_start;
    *content = malloc(content_len + 1);
    strncpy(*content, content_start, content_len);
    (*content)[content_len] = '\0';
    
    return start;
}

static char *string_replace_first(const char *str, int start, int end, const char *replacement) {
    size_t prefix_len = start;
    size_t suffix_len = strlen(str) - end;
    size_t replace_len = replacement ? strlen(replacement) : 0;
    size_t new_len = prefix_len + replace_len + suffix_len;
    
    char *result = malloc(new_len + 1);
    strncpy(result, str, prefix_len);
    if (replacement) {
        strcpy(result + prefix_len, replacement);
    }
    strcpy(result + prefix_len + replace_len, str + end);
    
    return result;
}

static char *string_append(const char *str1, const char *str2) {
    size_t len1 = str1 ? strlen(str1) : 0;
    size_t len2 = str2 ? strlen(str2) : 0;
    char *result = malloc(len1 + len2 + 1);
    if (str1) strcpy(result, str1);
    else result[0] = '\0';
    if (str2) strcpy(result + len1, str2);
    return result;
}

static char *string_replace_all(const char *str, const char *find, const char *replace) {
    if (!str || !find) return string_duplicate(str);
    
    size_t find_len = strlen(find);
    if (find_len == 0) return string_duplicate(str);
    
    size_t replace_len = replace ? strlen(replace) : 0;
    
    int count = 0;
    const char *tmp = str;
    while ((tmp = strstr(tmp, find)) != NULL) {
        count++;
        tmp += find_len;
    }
    
    size_t new_len = strlen(str) + count * (replace_len - find_len);
    char *result = malloc(new_len + 1);
    
    char *dst = result;
    const char *src = str;
    while (1) {
        const char *match = strstr(src, find);
        if (!match) {
            strcpy(dst, src);
            break;
        }
        
        size_t prefix_len = match - src;
        strncpy(dst, src, prefix_len);
        dst += prefix_len;
        
        if (replace) {
            strcpy(dst, replace);
            dst += replace_len;
        }
        
        src = match + find_len;
    }
    
    return result;
}

typedef struct {
    char *name;
    char *value;
} Define;

typedef struct {
    Define *items;
    int count;
} DefineList;

static void free_define_list(DefineList *list) {
    for (int i = 0; i < list->count; i++) {
        free(list->items[i].name);
        free(list->items[i].value);
    }
    free(list->items);
}

static char *process_uses(char *code) {
    char *result = code;
    char *content;
    int start_pos, end_pos;
    
    while (find_pattern(result, "$use", ">", &content, &start_pos, &end_pos)) {
        char *temp = string_replace_first(result, start_pos, end_pos, "");
        if (result != code) free(result);
        result = temp;
        free(content);
    }
    
    return result;
}

static char *process_includes(Preprocessor *preprocessor, char *code);

static char *process_includes_impl(Preprocessor *preprocessor, char *code) {
    char *result = string_duplicate(code);
    char *content;
    int start_pos, end_pos;
    
    while (find_pattern(result, "$include", ">", &content, &start_pos, &end_pos)) {
        char *include_start = strstr(content, "<");
        char *filename = include_start ? include_start + 1 : content;
        
        if (!is_file_included(preprocessor, filename)) {
            char *new_code = try_read(preprocessor, filename);
            if (!new_code) {
                fprintf(stderr, "Include %s not found!\n", filename);
                exit(1);
            }
            
            add_included_file(preprocessor, filename);
            
            char *processed_use = process_uses(new_code);
            if (new_code != processed_use) free(new_code);
            
            char *processed = process_includes(preprocessor, processed_use);
            if (processed_use != processed) free(processed_use);
            
            char *file_marker = malloc(strlen(filename) + 20);
            sprintf(file_marker, "\n//@file %s\n", filename);
            
            char *replacement = string_append(file_marker, processed);
            free(file_marker);
            
            char *with_end = string_append(replacement, "\n//@endfile");
            free(replacement);
            free(processed);
            
            char *temp = string_replace_first(result, start_pos, end_pos, with_end);
            free(result);
            result = temp;
            free(with_end);
        } else {
            char *temp = string_replace_first(result, start_pos, end_pos, "");
            free(result);
            result = temp;
        }
        
        free(content);
    }
    
    return result;
}

static char *process_includes(Preprocessor *preprocessor, char *code) {
    return process_includes_impl(preprocessor, code);
}

static char *process_natives(char *code) {
    char *result = code;
    char *content;
    int start_pos, end_pos;
    
    while (find_pattern(result, "$native", ">", &content, &start_pos, &end_pos)) {
        char *temp = string_replace_first(result, start_pos, end_pos, "");
        if (result != code) free(result);
        result = temp;
        free(content);
    }
    
    return result;
}

static char *process_defines(char *code) {
    DefineList defines = {NULL, 0};
    
    const char *line_start = code;
    while (*line_start) {
        const char *line_end = strchr(line_start, '\n');
        size_t line_len = line_end ? (size_t)(line_end - line_start) : strlen(line_start);
        
        if (line_len >= 8 && strncmp(line_start, "$define ", 8) == 0) {
            const char *define_content = line_start + 8;
            while (isspace(*define_content) && define_content < line_start + line_len) {
                define_content++;
            }
            
            const char *space = define_content;
            while (space < line_start + line_len && !isspace(*space)) {
                space++;
            }
            
            if (space < line_start + line_len) {
                size_t name_len = space - define_content;
                char *name = malloc(name_len + 1);
                strncpy(name, define_content, name_len);
                name[name_len] = '\0';
                
                const char *value_start = space;
                while (value_start < line_start + line_len && isspace(*value_start)) {
                    value_start++;
                }
                
                size_t value_len = line_start + line_len - value_start;
                char *value = malloc(value_len + 1);
                strncpy(value, value_start, value_len);
                value[value_len] = '\0';
                
                defines.items = realloc(defines.items, (defines.count + 1) * sizeof(Define));
                defines.items[defines.count].name = name;
                defines.items[defines.count].value = value;
                defines.count++;
            }
        }
        
        if (line_end) {
            line_start = line_end + 1;
        } else {
            break;
        }
    }
    
    char *result = string_duplicate(code);
    for (int i = 0; i < defines.count; i++) {
        char *new_result = string_replace_all(result, defines.items[i].name, defines.items[i].value);
        free(result);
        result = new_result;
    }
    
    size_t result_capacity = strlen(result) + 256;
    char *filtered = malloc(result_capacity);
    size_t filtered_len = 0;
    
    line_start = result;
    while (*line_start) {
        const char *line_end = strchr(line_start, '\n');
        size_t line_len = line_end ? (size_t)(line_end - line_start) : strlen(line_start);
        int has_newline = (line_end != NULL);
        
        if (line_len < 8 || strncmp(line_start, "$define ", 8) != 0) {
            if (filtered_len + line_len + 2 > result_capacity) {
                result_capacity = (filtered_len + line_len + 2) * 2;
                filtered = realloc(filtered, result_capacity);
            }
            
            memcpy(filtered + filtered_len, line_start, line_len);
            filtered_len += line_len;
            if (has_newline) {
                filtered[filtered_len++] = '\n';
            }
        }
        
        if (line_end) {
            line_start = line_end + 1;
        } else {
            break;
        }
    }
    
    filtered[filtered_len] = '\0';
    free(result);
    free_define_list(&defines);
    
    return filtered;
}

Preprocessor *preprocessor_new(char **include_paths, int include_path_count) {
    Preprocessor *preprocessor = malloc(sizeof(Preprocessor));
    
    preprocessor->include_path_count = include_path_count;
    preprocessor->include_paths = malloc(include_path_count * sizeof(char *));
    for (int i = 0; i < include_path_count; i++) {
        preprocessor->include_paths[i] = string_duplicate(include_paths[i]);
    }
    
    preprocessor->included_files = NULL;
    preprocessor->included_file_count = 0;
    
    return preprocessor;
}

void preprocessor_free(Preprocessor *preprocessor) {
    if (!preprocessor) return;
    
    for (int i = 0; i < preprocessor->include_path_count; i++) {
        free(preprocessor->include_paths[i]);
    }
    free(preprocessor->include_paths);
    
    for (int i = 0; i < preprocessor->included_file_count; i++) {
        free(preprocessor->included_files[i]);
    }
    free(preprocessor->included_files);
    
    free(preprocessor);
}

char *preprocessor_process(Preprocessor *preprocessor, char *code) {
    char *after_use = process_uses(code);
    char *after_include = process_includes(preprocessor, after_use);
    char *after_native = process_natives(after_include);
    char *result = process_defines(after_native);
    
    if (after_native != after_include) free(after_native);
    if (after_include != after_use) free(after_include);
    if (after_use != code) free(after_use);
    
    return result;
}
