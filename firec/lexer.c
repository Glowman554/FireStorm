#include "lexer.h"
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <stdio.h>

static const char *keywords[] = {
    "function", "return", "if", "else", "for", "while", "break", "continue",
    "int", "str", "void", "chr", "ptr", "int32", "int16"
};
static const int num_keywords = 15;

static void lexer_advance(Lexer *lexer) {
    lexer->pos++;
    if (lexer->pos < lexer->length) {
        lexer->current = lexer->code[lexer->pos];
    } else {
        lexer->current = '\0';
    }
}

static void lexer_reverse(Lexer *lexer) {
    lexer->pos--;
    lexer->current = lexer->code[lexer->pos];
}

static int is_keyword(const char *str) {
    for (int i = 0; i < num_keywords; i++) {
        if (strcmp(str, keywords[i]) == 0) {
            return 1;
        }
    }
    return 0;
}

static char escape_character(char c) {
    switch (c) {
        case '"': return '"';
        case 'n': return '\n';
        case 'r': return '\r';
        case 't': return '\t';
        case 'b': return '\b';
        case '\\': return '\\';
        case '\'': return '\'';
        default: return c;
    }
}

static Token create_token(TokenType type, const char *value, int pos) {
    Token token;
    token.type = type;
    token.pos = pos;
    if (value != NULL) {
        token.value = strdup(value);
    } else {
        token.value = NULL;
    }
    return token;
}

static void token_list_add(TokenList *list, Token token) {
    if (list->count >= list->capacity) {
        list->capacity *= 2;
        list->tokens = realloc(list->tokens, list->capacity * sizeof(Token));
    }
    list->tokens[list->count++] = token;
}

Lexer *lexer_new(char *code) {
    Lexer *lexer = malloc(sizeof(Lexer));
    lexer->code = strdup(code);
    lexer->length = strlen(code);
    lexer->pos = -1;
    lexer->current = '\0';
    lexer_advance(lexer);
    return lexer;
}

void lexer_free(Lexer *lexer) {
    if (lexer) {
        free(lexer->code);
        free(lexer);
    }
}

TokenList *lexer_tokenize(Lexer *lexer) {
    TokenList *list = malloc(sizeof(TokenList));
    list->capacity = 16;
    list->count = 0;
    list->tokens = malloc(list->capacity * sizeof(Token));

    while (lexer->current != '\0') {
        if (isdigit(lexer->current)) {
            int start = lexer->pos;
            char num[64] = {0};
            int idx = 0;
            int base = 10;

            if (lexer->current == '0') {
                lexer_advance(lexer);
                if (lexer->current == 'x' || lexer->current == 'X') {
                    base = 16;
                    lexer_advance(lexer);
                } else if (lexer->current == 'b' || lexer->current == 'B') {
                    base = 2;
                    lexer_advance(lexer);
                } else {
                    lexer_reverse(lexer);
                }
            }

            while (lexer->current != '\0') {
                if (isdigit(lexer->current)) {
                    num[idx++] = lexer->current;
                    lexer_advance(lexer);
                } else if (base == 16 && ((lexer->current >= 'a' && lexer->current <= 'f') ||
                                          (lexer->current >= 'A' && lexer->current <= 'F'))) {
                    num[idx++] = lexer->current;
                    lexer_advance(lexer);
                } else {
                    break;
                }
            }

            num[idx] = '\0';
            long long value = strtoll(num, NULL, base);
            char value_str[32];
            snprintf(value_str, sizeof(value_str), "%lld", value);
            token_list_add(list, create_token(TOKEN_NUMBER, value_str, start));
            continue;
        }

        if (isalpha(lexer->current) || lexer->current == '_') {
            int start = lexer->pos;
            char id[256] = {0};
            int idx = 0;
            
            while (isalnum(lexer->current) || lexer->current == '_') {
                id[idx++] = lexer->current;
                lexer_advance(lexer);
            }
            id[idx] = '\0';
            
            token_list_add(list, create_token(TOKEN_ID, id, start));
            continue;
        }

        if (isspace(lexer->current)) {
            lexer_advance(lexer);
            continue;
        }

        int start = lexer->pos;
        switch (lexer->current) {
            case '\'': {
                lexer_advance(lexer);
                char chr = lexer->current;
                
                if (lexer->current == '\\') {
                    lexer_advance(lexer);
                    chr = escape_character(lexer->current);
                }
                
                lexer_advance(lexer);
                if (lexer->current != '\'') {
                    fprintf(stderr, "Expected ' at position %d\n", lexer->pos);
                }
                
                char chr_str[16];
                snprintf(chr_str, sizeof(chr_str), "%d", (int)chr);
                token_list_add(list, create_token(TOKEN_NUMBER, chr_str, start));
                break;
            }
            case '(':
                token_list_add(list, create_token(TOKEN_LPAREN, NULL, start));
                break;
            case ')':
                token_list_add(list, create_token(TOKEN_RPAREN, NULL, start));
                break;
            case '{':
                token_list_add(list, create_token(TOKEN_LBRACE, NULL, start));
                break;
            case '}':
                token_list_add(list, create_token(TOKEN_RBRACE, NULL, start));
                break;
            case '[':
                token_list_add(list, create_token(TOKEN_LBRACKET, NULL, start));
                break;
            case ']':
                token_list_add(list, create_token(TOKEN_RBRACKET, NULL, start));
                break;
            case ',':
                token_list_add(list, create_token(TOKEN_COMMA, NULL, start));
                break;
            case '+':
                lexer_advance(lexer);
                if (lexer->current == '+') {
                    token_list_add(list, create_token(TOKEN_INCREASE, NULL, start));
                } else {
                    lexer_reverse(lexer);
                    token_list_add(list, create_token(TOKEN_PLUS, NULL, start));
                }
                break;
            case '=':
                lexer_advance(lexer);
                if (lexer->current == '=') {
                    token_list_add(list, create_token(TOKEN_EQUALS, NULL, start));
                } else {
                    lexer_reverse(lexer);
                    token_list_add(list, create_token(TOKEN_ASSIGN, NULL, start));
                }
                break;
            case '*':
                token_list_add(list, create_token(TOKEN_MULTIPLY, NULL, start));
                break;
            case '%':
                token_list_add(list, create_token(TOKEN_MODULO, NULL, start));
                break;
            case '^':
                token_list_add(list, create_token(TOKEN_XOR, NULL, start));
                break;
            case '|':
                lexer_advance(lexer);
                if (lexer->current == '|') {
                    token_list_add(list, create_token(TOKEN_OR, NULL, start));
                } else {
                    lexer_reverse(lexer);
                    token_list_add(list, create_token(TOKEN_OR, NULL, start));
                }
                break;
            case '&':
                lexer_advance(lexer);
                if (lexer->current == '&') {
                    token_list_add(list, create_token(TOKEN_AND, NULL, start));
                } else {
                    lexer_reverse(lexer);
                    token_list_add(list, create_token(TOKEN_AND, NULL, start));
                }
                break;
            case '~':
                token_list_add(list, create_token(TOKEN_BIT_NOT, NULL, start));
                break;
            case ';':
                token_list_add(list, create_token(TOKEN_END_OF_LINE, NULL, start));
                break;
            case '>':
                lexer_advance(lexer);
                if (lexer->current == '=') {
                    token_list_add(list, create_token(TOKEN_MORE_EQUALS, NULL, start));
                } else if (lexer->current == '>') {
                    token_list_add(list, create_token(TOKEN_SHIFT_RIGHT, NULL, start));
                } else {
                    lexer_reverse(lexer);
                    token_list_add(list, create_token(TOKEN_MORE, NULL, start));
                }
                break;
            case '.':
                lexer_advance(lexer);
                if (lexer->current == '.') {
                    token_list_add(list, create_token(TOKEN_RANGE_DOT, NULL, start));
                } else {
                    fprintf(stderr, "Illegal token at position %d\n", lexer->pos);
                }
                break;
            case '<':
                lexer_advance(lexer);
                if (lexer->current == '=') {
                    token_list_add(list, create_token(TOKEN_LESS_EQUALS, NULL, start));
                } else if (lexer->current == '<') {
                    token_list_add(list, create_token(TOKEN_SHIFT_LEFT, NULL, start));
                } else {
                    lexer_reverse(lexer);
                    token_list_add(list, create_token(TOKEN_LESS, NULL, start));
                }
                break;
            case '!':
                lexer_advance(lexer);
                if (lexer->current == '=') {
                    token_list_add(list, create_token(TOKEN_NOT_EQUALS, NULL, start));
                } else {
                    lexer_reverse(lexer);
                    token_list_add(list, create_token(TOKEN_NOT, NULL, start));
                }
                break;
            case '-':
                lexer_advance(lexer);
                if (lexer->current == '>') {
                    token_list_add(list, create_token(TOKEN_ARROW, NULL, start));
                } else if (lexer->current == '-') {
                    token_list_add(list, create_token(TOKEN_DECREASE, NULL, start));
                } else {
                    lexer_reverse(lexer);
                    token_list_add(list, create_token(TOKEN_MINUS, NULL, start));
                }
                break;
            case '/':
                lexer_advance(lexer);
                if (lexer->current == '/') {
                    // Single-line comment
                    lexer_advance(lexer);
                    while (lexer->current != '\0' && lexer->current != '\n') {
                        lexer_advance(lexer);
                    }
                    continue;
                } else if (lexer->current == '*') {
                    // Multi-line comment
                    lexer_advance(lexer);
                    while (lexer->current != '\0') {
                        if (lexer->current == '*') {
                            lexer_advance(lexer);
                            if (lexer->current == '/') {
                                lexer_advance(lexer);
                                break;
                            }
                        } else {
                            lexer_advance(lexer);
                        }
                    }
                    continue;
                } else {
                    lexer_reverse(lexer);
                    token_list_add(list, create_token(TOKEN_DIVIDE, NULL, start));
                }
                break;
            case '"': {
                char str[1024] = {0};
                int idx = 0;
                lexer_advance(lexer);
                
                while (lexer->current != '"' && lexer->current != '\0') {
                    if (lexer->current == '\\') {
                        lexer_advance(lexer);
                        str[idx++] = escape_character(lexer->current);
                        lexer_advance(lexer);
                    } else {
                        str[idx++] = lexer->current;
                        lexer_advance(lexer);
                    }
                }
                
                str[idx] = '\0';
                token_list_add(list, create_token(TOKEN_STRING, str, start));
                break;
            }
            default:
                fprintf(stderr, "Illegal token '%c' at position %d\n", lexer->current, lexer->pos);
                break;
        }

        lexer_advance(lexer);
    }

    token_list_add(list, create_token(TOKEN_EOF, NULL, lexer->pos));
    return list;
}

void token_list_free(TokenList *list) {
    if (list) {
        for (int i = 0; i < list->count; i++) {
            free(list->tokens[i].value);
        }
        free(list->tokens);
        free(list);
    }
}
