#ifndef BYTECODE_H
#define BYTECODE_H

#include "parser.h"

typedef struct {
    Node *global;
    char *code;
    int label_counter;
} Bytecode;

Bytecode *bytecode_new(Node *global, char *code);
void bytecode_free(Bytecode *bytecode);
char *bytecode_compile(Bytecode *bc);

#endif
