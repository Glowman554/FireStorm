#ifndef PREPROCESSOR_H
#define PREPROCESSOR_H

typedef struct {
    char **include_paths;
    int include_path_count;
    char **included_files;
    int included_file_count;
} Preprocessor;

Preprocessor *preprocessor_new(char **include_paths, int include_path_count);
void preprocessor_free(Preprocessor *preprocessor);
char *preprocessor_process(Preprocessor *preprocessor, char *code);

#endif
