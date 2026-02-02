#ifndef PARSER_H
#define PARSER_H

#include "lexer.h"

typedef enum {
    NODE_GLOBAL,
    NODE_FUNCTION,
    NODE_ASSEMBLY_CODE,
    NODE_VARIABLE_DECLARATION,
    NODE_NUMBER,
    NODE_STRING,
    NODE_ADD,
    NODE_SUBTRACT,
    NODE_MULTIPLY,
    NODE_DIVIDE,
    NODE_PLUS,
    NODE_MINUS,
    NODE_MODULO,
    NODE_VARIABLE_LOOKUP,
    NODE_VARIABLE_LOOKUP_ARRAY,
    NODE_COMPARE,
    NODE_NOT,
    NODE_IF,
    NODE_FUNCTION_CALL,
    NODE_RETURN,
    NODE_VARIABLE_ASSIGN,
    NODE_VARIABLE_ASSIGN_ARRAY,
    NODE_CONDITIONAL_LOOP,
    NODE_UPDATE_CONDITIONAL_LOOP,
    NODE_POST_CONDITIONAL_LOOP,
    NODE_LOOP,
    NODE_SHIFT_LEFT,
    NODE_SHIFT_RIGHT,
    NODE_AND,
    NODE_OR,
    NODE_XOR,
    NODE_BIT_NOT,
    NODE_OFFSET,
    NODE_CONTINUE,
    NODE_BREAK,
    NODE_END
} NodeType;

typedef enum {
    DATATYPE_INT,
    DATATYPE_STR,
    DATATYPE_VOID,
    DATATYPE_CHR,
    DATATYPE_PTR,
    DATATYPE_INT_32,
    DATATYPE_INT_16
} Datatype;

typedef struct Node {
    NodeType type;
    struct Node *a;
    struct Node *b;
    void *value;
    int pos;
} Node;

typedef struct {
    char *name;
    Datatype datatype;
    int is_array;
} Variable;

typedef struct {
    char *name;
    Variable *params;
    int param_count;
    Datatype return_type;
    int return_is_array;
    Node **body;
    int body_count;
    int is_external;  // External function (no body)
} Function;

typedef struct {
    TokenList *tokens;
    int pos;
    char *code;
} Parser;

Parser *parser_new(TokenList *tokens, char *code);
void parser_free(Parser *parser);
Node *parser_global(Parser *parser);
void node_free(Node *node);

#endif
