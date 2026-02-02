#include "bytecode.h"
#include "encoder.h"
#include "lexer.h"
#include "linker.h"
#include "parser.h"
#include "preprocessor.h"
#include "vm.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void print_usage(char* program_name) {
    printf("Usage: %s --input=<file> --output=<file> [--include=<path>]\n", program_name);
    printf("  --input=<file>    Input .fl file to compile\n");
    printf("  --output=<file>   Output file (.flb for text, .flbb for binary)\n");
    printf("  --include=<path>  Add directory to include path (can be used multiple times)\n");
}

char* read_source_file(const char* filename) {
    FILE* f = fopen(filename, "rb");
    if (!f) {
        fprintf(stderr, "Error: Could not open file %s\n", filename);
        return NULL;
    }

    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    if (size < 0) {
        fprintf(stderr, "Error: Could not determine file size for %s\n", filename);
        fclose(f);
        return NULL;
    }
    fseek(f, 0, SEEK_SET);

    char* buffer = malloc(size + 1);

    size_t bytes_read = fread(buffer, 1, size, f);
    if (bytes_read != (size_t)size) {
        fprintf(stderr, "Error: Failed to read complete file %s\n", filename);
        free(buffer);
        fclose(f);
        return NULL;
    }
    buffer[size] = '\0';
    fclose(f);

    return buffer;
}

int write_file(const char* filename, const char* content) {
    FILE* f = fopen(filename, "wb");
    if (!f) {
        fprintf(stderr, "Error: Could not write to file %s\n", filename);
        return 0;
    }

    fprintf(f, "%s", content);
    fclose(f);
    return 1;
}

int write_binary_file(const char* filename, const unsigned char* data, size_t size) {
    FILE* f = fopen(filename, "wb");
    if (!f) {
        fprintf(stderr, "Error: Could not write to file %s\n", filename);
        return 0;
    }

    size_t written = fwrite(data, 1, size, f);
    fclose(f);
    return written == size;
}

int main(int argc, char** argv) {
    if (argc < 3) {
        print_usage(argv[0]);
        return 1;
    }

    char* input = NULL;
    char* output = NULL;
    char** include_paths = NULL;
    int include_path_count = 0;

    // Parse arguments
    for (int i = 1; i < argc; i++) {
        if (strncmp(argv[i], "--input=", 8) == 0) {
            input = argv[i] + 8;
        } else if (strncmp(argv[i], "--output=", 9) == 0) {
            output = argv[i] + 9;
        } else if (strncmp(argv[i], "--include=", 10) == 0) {
            char* path = argv[i] + 10;
            int len = strlen(path);
            include_paths = realloc(include_paths, (include_path_count + 1) * sizeof(char*));

            // Add trailing slash if not present
            if (len > 0 && path[len - 1] != '/') {
                char* path_with_slash = malloc(len + 2);
                strcpy(path_with_slash, path);
                strcat(path_with_slash, "/");
                include_paths[include_path_count] = path_with_slash;
            } else {
                include_paths[include_path_count] = strdup(path);
            }
            include_path_count++;
        }
    }

    if (!input) {
        fprintf(stderr, "Error: --input is required\n");
        print_usage(argv[0]);
        free(include_paths);
        return 1;
    }

    // Read input file
    char* code = read_source_file(input);
    if (!code) {
        free(include_paths);
        return 1;
    }

    // Preprocess
    Preprocessor* preprocessor = preprocessor_new(include_paths, include_path_count);
    char* processed_code = preprocessor_process(preprocessor, code);
    free(code);

    // Tokenize
    Lexer* lexer = lexer_new(processed_code);
    TokenList* tokens = lexer_tokenize(lexer);

    // Parse
    Parser* parser = parser_new(tokens, processed_code);
    Node* global = parser_global(parser);

    // Compile to bytecode
    Bytecode* bc = bytecode_new(global, processed_code);
    char* result = bytecode_compile(bc);

    // Encode and link if requested
    char* encoded = encode_bytecode(result);
    free(result);

    size_t binary_size;
    unsigned char* binary = link_bytecode(encoded, &binary_size);
    free(encoded);

    if (output) { 
        if (!write_binary_file(output, binary, binary_size)) {
            free(binary);
            bytecode_free(bc);
            node_free(global);
            parser_free(parser);
            token_list_free(tokens);
            lexer_free(lexer);
            free(processed_code);
            preprocessor_free(preprocessor);
            free(include_paths);
            return 1;
        }
        printf("Successfully compiled and encoded %s to %s (%zu bytes)\n", input, output, binary_size);
    } else {
        printf("Successfully compiled and encoded %s (%zu bytes)\n", input, binary_size);
        
        struct vm_instance* vm = vm_create(binary);

        stack_push(vm, argc);
        stack_push(vm, (int64_t)argv);

        invoke(vm, vm->spark);
    }

    free(binary);

    // Cleanup
    bytecode_free(bc);
    node_free(global);
    parser_free(parser);
    token_list_free(tokens);
    lexer_free(lexer);
    free(processed_code);
    preprocessor_free(preprocessor);
    free(include_paths);

    return 0;
}
