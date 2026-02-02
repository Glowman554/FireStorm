#ifndef LEXER_H
#define LEXER_H

typedef enum {
    TOKEN_ID,
    TOKEN_LPAREN,
    TOKEN_RPAREN,
    TOKEN_LBRACE,
    TOKEN_RBRACE,
    TOKEN_LBRACKET,
    TOKEN_RBRACKET,
    TOKEN_DIVIDE,
    TOKEN_COMMA,
    TOKEN_ARROW,
    TOKEN_STRING,
    TOKEN_ASSIGN,
    TOKEN_PLUS,
    TOKEN_MINUS,
    TOKEN_MULTIPLY,
    TOKEN_NUMBER,
    TOKEN_MODULO,
    TOKEN_XOR,
    TOKEN_AND,
    TOKEN_OR,
    TOKEN_SHIFT_LEFT,
    TOKEN_SHIFT_RIGHT,
    TOKEN_BIT_NOT,
    TOKEN_END_OF_LINE,
    TOKEN_EQUALS,
    TOKEN_NOT_EQUALS,
    TOKEN_LESS,
    TOKEN_LESS_EQUALS,
    TOKEN_MORE,
    TOKEN_MORE_EQUALS,
    TOKEN_NOT,
    TOKEN_INCREASE,
    TOKEN_DECREASE,
    TOKEN_RANGE_DOT,
    TOKEN_EOF
} TokenType;

typedef struct {
    TokenType type;
    char *value;
    int pos;
} Token;

typedef struct {
    Token *tokens;
    int count;
    int capacity;
} TokenList;

typedef struct {
    char *code;
    int pos;
    int length;
    char current;
} Lexer;

Lexer *lexer_new(char *code);
void lexer_free(Lexer *lexer);
TokenList *lexer_tokenize(Lexer *lexer);
void token_list_free(TokenList *list);

#endif
