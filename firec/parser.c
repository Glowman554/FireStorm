#define _POSIX_C_SOURCE 200809L
#include "parser.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

// Forward declarations
static Node *parse_expression(Parser *p);
static Node *parse_statement(Parser *p);
static Node *parse_factor(Parser *p);
static Node *parse_term(Parser *p);
static Node *parse_compare(Parser *p);
static Node *parse_bit_logic(Parser *p);

// Helper functions
static Token *current_token(Parser *p) {
    if (p->pos < p->tokens->count) {
        return &p->tokens->tokens[p->pos];
    }
    return NULL;
}

static void advance(Parser *p) {
    if (p->pos < p->tokens->count) {
        p->pos++;
    }
}

static void reverse(Parser *p) {
    if (p->pos > 0) {
        p->pos--;
    }
}

static void parser_error(Parser *p __attribute__((unused)), const char *message, int pos) {
    fprintf(stderr, "Parser error at position %d: %s\n", pos, message);
    exit(1);
}

static void expect(Parser *p, TokenType type) {
    Token *tok = current_token(p);
    if (!tok || tok->type != type) {
        parser_error(p, "Unexpected token type", tok ? tok->pos : 0);
    }
}

static Node *node_new(NodeType type, Node *a, Node *b, void *value, int pos) {
    Node *node = malloc(sizeof(Node));
    if (!node) {
        fprintf(stderr, "Fatal: memory allocation failed\n");
        exit(1);
    }
    node->type = type;
    node->a = a;
    node->b = b;
    node->value = value;
    node->pos = pos;
    return node;
}

static int is_datatype_string(const char *str) {
    return strcmp(str, "int") == 0 ||
           strcmp(str, "str") == 0 ||
           strcmp(str, "void") == 0 ||
           strcmp(str, "chr") == 0 ||
           strcmp(str, "ptr") == 0 ||
           strcmp(str, "int32") == 0 ||
           strcmp(str, "int16") == 0 ||
           strcmp(str, "i32") == 0 ||
           strcmp(str, "i16") == 0;
}

static Datatype string_to_datatype(const char *str) {
    if (strcmp(str, "int") == 0) return DATATYPE_INT;
    if (strcmp(str, "str") == 0) return DATATYPE_STR;
    if (strcmp(str, "void") == 0) return DATATYPE_VOID;
    if (strcmp(str, "chr") == 0) return DATATYPE_CHR;
    if (strcmp(str, "ptr") == 0) return DATATYPE_PTR;
    if (strcmp(str, "int32") == 0 || strcmp(str, "i32") == 0) return DATATYPE_INT_32;
    if (strcmp(str, "int16") == 0 || strcmp(str, "i16") == 0) return DATATYPE_INT_16;
    return DATATYPE_INT;
}

static Variable parse_datatype_named(Parser *p) {
    Variable var;
    Token *tok = current_token(p);
    
    if (!tok || tok->type != TOKEN_ID) {
        parser_error(p, "Expected datatype", tok ? tok->pos : 0);
    }
    
    var.datatype = string_to_datatype(tok->value);
    advance(p);
    
    tok = current_token(p);
    if (tok->type == TOKEN_LBRACKET) {
        advance(p);
        expect(p, TOKEN_RBRACKET);
        advance(p);
        tok = current_token(p);
        expect(p, TOKEN_ID);
        var.is_array = 1;
        var.name = strdup(tok->value);
        advance(p);
    } else {
        expect(p, TOKEN_ID);
        var.is_array = 0;
        var.name = strdup(tok->value);
        advance(p);
    }
    
    return var;
}

static void parse_datatype_unnamed(Parser *p, Datatype *dt, int *is_array) {
    Token *tok = current_token(p);
    
    if (!tok || tok->type != TOKEN_ID) {
        parser_error(p, "Expected datatype", tok ? tok->pos : 0);
    }
    
    *dt = string_to_datatype(tok->value);
    advance(p);
    
    tok = current_token(p);
    if (tok && tok->type == TOKEN_LBRACKET) {
        advance(p);
        expect(p, TOKEN_RBRACKET);
        advance(p);
        *is_array = 1;
    } else {
        *is_array = 0;
    }
}

// Parse primary expressions (literals, variables, function calls)
static Node *parse_factor(Parser *p) {
    Token *tok = current_token(p);
    
    if (!tok) {
        return NULL;
    }
    
    if (tok->type == TOKEN_LPAREN) {
        advance(p);
        Node *result = parse_expression(p);
        expect(p, TOKEN_RPAREN);
        advance(p);
        return result;
    }
    
    if (tok->type == TOKEN_NUMBER) {
        int *value = malloc(sizeof(int));
        *value = atoi(tok->value);
        advance(p);
        return node_new(NODE_NUMBER, NULL, NULL, value, tok->pos);
    }
    
    if (tok->type == TOKEN_STRING) {
        char *str = strdup(tok->value);
        advance(p);
        return node_new(NODE_STRING, NULL, NULL, str, tok->pos);
    }
    
    if (tok->type == TOKEN_NOT) {
        int pos = tok->pos;
        advance(p);
        return node_new(NODE_NOT, parse_expression(p), NULL, NULL, pos);
    }
    
    if (tok->type == TOKEN_BIT_NOT) {
        int pos = tok->pos;
        advance(p);
        return node_new(NODE_BIT_NOT, parse_expression(p), NULL, NULL, pos);
    }
    
    if (tok->type == TOKEN_PLUS) {
        int pos = tok->pos;
        advance(p);
        return node_new(NODE_PLUS, parse_factor(p), NULL, NULL, pos);
    }
    
    if (tok->type == TOKEN_MINUS) {
        int pos = tok->pos;
        advance(p);
        return node_new(NODE_MINUS, parse_factor(p), NULL, NULL, pos);
    }
    
    if (tok->type == TOKEN_ID) {
        char *name = strdup(tok->value);
        int pos = tok->pos;
        advance(p);
        
        tok = current_token(p);
        if (tok && tok->type == TOKEN_LPAREN) {
            // Function call
            advance(p);
            
            Node **args = NULL;
            int arg_count = 0;
            int arg_capacity = 0;
            
            tok = current_token(p);
            if (tok->type != TOKEN_RPAREN) {
                while (1) {
                    Node *expr = parse_expression(p);
                    if (!expr) {
                        parser_error(p, "Expected expression", current_token(p)->pos);
                    }
                    
                    if (arg_count >= arg_capacity) {
                        arg_capacity = arg_capacity == 0 ? 4 : arg_capacity * 2;
                        Node **new_args = realloc(args, arg_capacity * sizeof(Node*));
                        if (!new_args) {
                            fprintf(stderr, "Fatal: memory allocation failed\n");
                            exit(1);
                        }
                        args = new_args;
                    }
                    args[arg_count++] = expr;
                    
                    tok = current_token(p);
                    if (tok->type == TOKEN_COMMA) {
                        advance(p);
                    } else if (tok->type == TOKEN_RPAREN) {
                        break;
                    } else {
                        parser_error(p, "Expected comma or )", tok->pos);
                    }
                }
            }
            
            expect(p, TOKEN_RPAREN);
            advance(p);
            
            // Store function call info
            Node **call_args = malloc((arg_count + 1) * sizeof(Node*));
            call_args[0] = (Node*)name; // Store name as first element
            for (int i = 0; i < arg_count; i++) {
                call_args[i + 1] = args[i];
            }
            free(args);
            
            return node_new(NODE_FUNCTION_CALL, NULL, NULL, call_args, pos);
        }
        
        if (tok && tok->type == TOKEN_LBRACKET) {
            // Array access
            advance(p);
            Node *index = parse_expression(p);
            expect(p, TOKEN_RBRACKET);
            advance(p);
            return node_new(NODE_VARIABLE_LOOKUP_ARRAY, index, NULL, name, pos);
        }
        
        // Variable lookup
        return node_new(NODE_VARIABLE_LOOKUP, NULL, NULL, name, pos);
    }
    
    if (tok->type == TOKEN_END_OF_LINE) {
        return NULL;
    }
    
    parser_error(p, "Invalid factor", tok->pos);
    return NULL;
}

// Parse bitwise operations
static Node *parse_bit_logic(Parser *p) {
    Node *result = parse_factor(p);
    Token *tok;
    
    while ((tok = current_token(p)) != NULL) {
        int pos = tok->pos;
        
        if (tok->type == TOKEN_AND) {
            advance(p);
            result = node_new(NODE_AND, result, parse_factor(p), NULL, pos);
        } else if (tok->type == TOKEN_OR) {
            advance(p);
            result = node_new(NODE_OR, result, parse_factor(p), NULL, pos);
        } else if (tok->type == TOKEN_XOR) {
            advance(p);
            result = node_new(NODE_XOR, result, parse_factor(p), NULL, pos);
        } else if (tok->type == TOKEN_SHIFT_LEFT) {
            advance(p);
            result = node_new(NODE_SHIFT_LEFT, result, parse_factor(p), NULL, pos);
        } else if (tok->type == TOKEN_SHIFT_RIGHT) {
            advance(p);
            result = node_new(NODE_SHIFT_RIGHT, result, parse_factor(p), NULL, pos);
        } else {
            break;
        }
    }
    
    return result;
}

// Parse multiplication and division
static Node *parse_term(Parser *p) {
    Node *result = parse_bit_logic(p);
    Token *tok;
    
    while ((tok = current_token(p)) != NULL) {
        int pos = tok->pos;
        
        if (tok->type == TOKEN_MULTIPLY) {
            advance(p);
            result = node_new(NODE_MULTIPLY, result, parse_bit_logic(p), NULL, pos);
        } else if (tok->type == TOKEN_DIVIDE) {
            advance(p);
            result = node_new(NODE_DIVIDE, result, parse_bit_logic(p), NULL, pos);
        } else if (tok->type == TOKEN_MODULO) {
            advance(p);
            result = node_new(NODE_MODULO, result, parse_bit_logic(p), NULL, pos);
        } else {
            break;
        }
    }
    
    return result;
}

// Parse comparison operators
static Node *parse_compare(Parser *p) {
    Node *result = parse_term(p);
    Token *tok;
    
    while ((tok = current_token(p)) != NULL) {
        int pos = tok->pos;
        int *comp_type = NULL;
        
        if (tok->type == TOKEN_EQUALS ||
            tok->type == TOKEN_NOT_EQUALS ||
            tok->type == TOKEN_LESS ||
            tok->type == TOKEN_LESS_EQUALS ||
            tok->type == TOKEN_MORE ||
            tok->type == TOKEN_MORE_EQUALS) {
            
            comp_type = malloc(sizeof(int));
            *comp_type = tok->type;
            advance(p);
            result = node_new(NODE_COMPARE, result, parse_term(p), comp_type, pos);
        } else {
            break;
        }
    }
    
    return result;
}

// Parse addition and subtraction
static Node *parse_expression(Parser *p) {
    Node *result = parse_compare(p);
    Token *tok;
    
    while ((tok = current_token(p)) != NULL) {
        int pos = tok->pos;
        
        if (tok->type == TOKEN_PLUS) {
            advance(p);
            result = node_new(NODE_ADD, result, parse_compare(p), NULL, pos);
        } else if (tok->type == TOKEN_MINUS) {
            advance(p);
            result = node_new(NODE_SUBTRACT, result, parse_compare(p), NULL, pos);
        } else {
            break;
        }
    }
    
    return result;
}

// Parse a code block
static Node **parse_code_block(Parser *p, int *body_count) {
    Node **body = NULL;
    int count = 0;
    int capacity = 0;
    
    expect(p, TOKEN_LBRACE);
    advance(p);
    
    while (1) {
        Token *tok = current_token(p);
        if (!tok || tok->type == TOKEN_RBRACE) {
            *body_count = count;
            return body;
        }
        
        Node *stmt = parse_statement(p);
        if (stmt) {
            if (count >= capacity) {
                capacity = capacity == 0 ? 8 : capacity * 2;
                Node **new_body = realloc(body, capacity * sizeof(Node*));
                if (!new_body) {
                    fprintf(stderr, "Fatal: memory allocation failed\n");
                    exit(1);
                }
                body = new_body;
            }
            body[count++] = stmt;
        }
        
        advance(p);
    }
}

// Parse if statement
static Node *parse_if(Parser *p) {
    int if_pos = current_token(p)->pos;
    advance(p);
    
    Node *condition = parse_expression(p);
    if (!condition) {
        parser_error(p, "Expected condition", current_token(p)->pos);
    }
    
    int true_count = 0;
    Node **true_block = parse_code_block(p, &true_count);
    expect(p, TOKEN_RBRACE);
    advance(p);
    
    int false_count = 0;
    Node **false_block = NULL;
    
    Token *tok = current_token(p);
    if (tok && tok->type == TOKEN_ID && strcmp(tok->value, "else") == 0) {
        advance(p);
        tok = current_token(p);
        
        if (tok && tok->type == TOKEN_ID && strcmp(tok->value, "if") == 0) {
            // else if
            false_block = malloc(sizeof(Node*));
            false_block[0] = parse_if(p);
            false_count = 1;
            expect(p, TOKEN_RBRACE);
        } else {
            // else
            false_block = parse_code_block(p, &false_count);
            expect(p, TOKEN_RBRACE);
        }
    } else {
        reverse(p);
    }
    
    // Pack if data: condition, true_block, false_block
    Node ***if_data = malloc(sizeof(Node**) * 2 + sizeof(int) * 2);
    if_data[0] = true_block;
    if_data[1] = false_block;
    int *counts = (int*)(if_data + 2);
    counts[0] = true_count;
    counts[1] = false_count;
    
    return node_new(NODE_IF, condition, NULL, if_data, if_pos);
}

// Parse a single statement
static Node *parse_statement(Parser *p) {
    Token *tok = current_token(p);
    
    if (!tok) {
        return NULL;
    }
    
    int pos = tok->pos;
    
    // Keywords
    if (tok->type == TOKEN_ID) {
        // return
        if (strcmp(tok->value, "return") == 0) {
            advance(p);
            Node *expr = parse_expression(p);
            expect(p, TOKEN_END_OF_LINE);
            return node_new(NODE_RETURN, expr, NULL, NULL, pos);
        }
        
        // if
        if (strcmp(tok->value, "if") == 0) {
            return parse_if(p);
        }
        
        // while
        if (strcmp(tok->value, "while") == 0) {
            advance(p);
            Node *condition = parse_expression(p);
            if (!condition) {
                parser_error(p, "Expected condition", current_token(p)->pos);
            }
            int body_count = 0;
            Node **body = parse_code_block(p, &body_count);
            expect(p, TOKEN_RBRACE);
            
            // Store count + nodes: [count][node0][node1]...[nodeN]
            void **loop_data = malloc(sizeof(int) + sizeof(Node*) * body_count);
            *(int*)loop_data = body_count;
            Node **nodes_ptr = (Node**)((char*)loop_data + sizeof(int));
            for (int i = 0; i < body_count; i++) {
                nodes_ptr[i] = body[i];
            }
            free(body);
            
            return node_new(NODE_CONDITIONAL_LOOP, condition, NULL, loop_data, pos);
        }
        
        // for
        if (strcmp(tok->value, "for") == 0) {
            advance(p);
            Node *init = parse_statement(p);
            expect(p, TOKEN_END_OF_LINE);
            advance(p);
            
            Node *condition = parse_expression(p);
            expect(p, TOKEN_END_OF_LINE);
            advance(p);
            
            Node *update = parse_statement(p);
            
            int body_count = 0;
            Node **body = parse_code_block(p, &body_count);
            expect(p, TOKEN_RBRACE);
            
            // Store count + init + nodes: [count][init][node0][node1]...[nodeN]
            void **loop_data = malloc(sizeof(int) + sizeof(Node*) * (body_count + 1));
            *(int*)loop_data = body_count + 1;
            Node **nodes_ptr = (Node**)((char*)loop_data + sizeof(int));
            nodes_ptr[0] = init;
            for (int i = 0; i < body_count; i++) {
                nodes_ptr[i + 1] = body[i];
            }
            free(body);
            
            return node_new(NODE_UPDATE_CONDITIONAL_LOOP, condition, update, loop_data, pos);
        }
        
        // do-while
        if (strcmp(tok->value, "do") == 0) {
            advance(p);
            expect(p, TOKEN_LBRACE);
            int body_count = 0;
            Node **body = parse_code_block(p, &body_count);
            expect(p, TOKEN_RBRACE);
            advance(p);
            expect(p, TOKEN_ID);
            
            if (strcmp(current_token(p)->value, "while") != 0) {
                parser_error(p, "Expected 'while'", current_token(p)->pos);
            }
            advance(p);
            Node *condition = parse_expression(p);
            expect(p, TOKEN_END_OF_LINE);
            
            // Store count + nodes: [count][node0][node1]...[nodeN]
            void **loop_data = malloc(sizeof(int) + sizeof(Node*) * body_count);
            *(int*)loop_data = body_count;
            Node **nodes_ptr = (Node**)((char*)loop_data + sizeof(int));
            for (int i = 0; i < body_count; i++) {
                nodes_ptr[i] = body[i];
            }
            free(body);
            
            return node_new(NODE_POST_CONDITIONAL_LOOP, condition, NULL, loop_data, pos);
        }
        
        // loop
        if (strcmp(tok->value, "loop") == 0) {
            advance(p);
            int body_count = 0;
            Node **body = parse_code_block(p, &body_count);
            expect(p, TOKEN_RBRACE);
            
            // Store count + nodes: [count][node0][node1]...[nodeN]
            void **loop_data = malloc(sizeof(int) + sizeof(Node*) * body_count);
            *(int*)loop_data = body_count;
            Node **nodes_ptr = (Node**)((char*)loop_data + sizeof(int));
            for (int i = 0; i < body_count; i++) {
                nodes_ptr[i] = body[i];
            }
            free(body);
            
            return node_new(NODE_LOOP, NULL, NULL, loop_data, pos);
        }
        
        // range
        if (strcmp(tok->value, "range") == 0) {
            advance(p);
            
            // Parse start expression
            Node *start = parse_expression(p);
            
            // Expect ..
            expect(p, TOKEN_RANGE_DOT);
            advance(p);
            
            // Parse end expression
            Node *end = parse_expression(p);
            
            // Expect 'as'
            expect(p, TOKEN_ID);
            if (strcmp(current_token(p)->value, "as") != 0) {
                parser_error(p, "Expected 'as'", current_token(p)->pos);
            }
            advance(p);
            
            // Parse variable name
            expect(p, TOKEN_ID);
            char *var_name = strdup(current_token(p)->value);
            advance(p);
            
            // Parse direction (up or down)
            expect(p, TOKEN_ID);
            int is_up = 1;  // default to up
            if (strcmp(current_token(p)->value, "up") == 0) {
                is_up = 1;
            } else if (strcmp(current_token(p)->value, "down") == 0) {
                is_up = 0;
            } else {
                parser_error(p, "Expected 'up' or 'down'", current_token(p)->pos);
            }
            advance(p);
            
            // Parse body
            int body_count = 0;
            Node **body = parse_code_block(p, &body_count);
            expect(p, TOKEN_RBRACE);
            
            // Store: [is_up][body_count][var_name][body...]
            // We'll use the value field to store var_name and a/b for start/end
            // For simplicity, convert to a for loop equivalent
            // range start .. end as i up {} becomes:
            // for i = start; i <= end; i++ {}
            
            // Create a for loop equivalent
            Variable var;
            var.name = var_name;
            var.datatype = DATATYPE_INT;
            var.is_array = 0;
            Variable *var_ptr = malloc(sizeof(Variable));
            *var_ptr = var;
            
            Node *init = node_new(NODE_VARIABLE_DECLARATION, start, NULL, var_ptr, pos);
            
            Node *var_lookup = node_new(NODE_VARIABLE_LOOKUP, NULL, NULL, strdup(var_name), pos);
            int *compare_type = malloc(sizeof(int));
            *compare_type = is_up ? TOKEN_LESS_EQUALS : TOKEN_MORE_EQUALS;
            Node *condition = node_new(NODE_COMPARE, var_lookup, end, compare_type, pos);
            
            int *one_val = malloc(sizeof(int));
            *one_val = 1;
            Node *one = node_new(NODE_NUMBER, NULL, NULL, one_val, pos);
            Node *var_lookup2 = node_new(NODE_VARIABLE_LOOKUP, NULL, NULL, strdup(var_name), pos);
            Node *update_expr = is_up ? 
                node_new(NODE_ADD, var_lookup2, one, NULL, pos) :
                node_new(NODE_SUBTRACT, var_lookup2, one, NULL, pos);
            Node *update = node_new(NODE_VARIABLE_ASSIGN, update_expr, NULL, strdup(var_name), pos);
            
            // Store count + init + nodes: [count][init][node0][node1]...[nodeN]
            void **loop_data = malloc(sizeof(int) + sizeof(Node*) * (body_count + 1));
            *(int*)loop_data = body_count + 1;
            Node **nodes_ptr = (Node**)((char*)loop_data + sizeof(int));
            nodes_ptr[0] = init;
            for (int i = 0; i < body_count; i++) {
                nodes_ptr[i + 1] = body[i];
            }
            free(body);
            
            return node_new(NODE_UPDATE_CONDITIONAL_LOOP, condition, update, loop_data, pos);
        }
        
        // break
        if (strcmp(tok->value, "break") == 0) {
            advance(p);
            expect(p, TOKEN_END_OF_LINE);
            return node_new(NODE_BREAK, NULL, NULL, NULL, pos);
        }
        
        // continue
        if (strcmp(tok->value, "continue") == 0) {
            advance(p);
            expect(p, TOKEN_END_OF_LINE);
            return node_new(NODE_CONTINUE, NULL, NULL, NULL, pos);
        }
        
        // end block (defer-like construct)
        if (strcmp(tok->value, "end") == 0) {
            advance(p);
            // parse_code_block will expect and advance past '{'
            int body_count = 0;
            Node **body = parse_code_block(p, &body_count);
            expect(p, TOKEN_RBRACE);
            
            // Store body in a node array
            Node **body_array = malloc(sizeof(Node*) * (body_count + 1));
            for (int i = 0; i < body_count; i++) {
                body_array[i] = body[i];
            }
            body_array[body_count] = NULL;
            free(body);
            
            return node_new(NODE_END, NULL, NULL, body_array, pos);
        }
        
        // Variable declaration
        if (is_datatype_string(tok->value)) {
            Variable var = parse_datatype_named(p);
            tok = current_token(p);
            
            if (tok->type == TOKEN_END_OF_LINE) {
                Variable *var_ptr = malloc(sizeof(Variable));
                *var_ptr = var;
                return node_new(NODE_VARIABLE_DECLARATION, NULL, NULL, var_ptr, pos);
            }
            
            expect(p, TOKEN_ASSIGN);
            advance(p);
            Node *expr = parse_expression(p);
            
            Variable *var_ptr = malloc(sizeof(Variable));
            *var_ptr = var;
            return node_new(NODE_VARIABLE_DECLARATION, expr, NULL, var_ptr, pos);
        }
        
        // Variable assignment or expression
        char *var_name = strdup(tok->value);
        advance(p);
        tok = current_token(p);
        
        if (tok->type == TOKEN_ASSIGN) {
            advance(p);
            Node *expr = parse_expression(p);
            return node_new(NODE_VARIABLE_ASSIGN, expr, NULL, var_name, pos);
        }
        
        if (tok->type == TOKEN_INCREASE) {
            advance(p);
            int *one = malloc(sizeof(int));
            *one = 1;
            Node *one_node = node_new(NODE_NUMBER, NULL, NULL, one, pos);
            Node *lookup = node_new(NODE_VARIABLE_LOOKUP, NULL, NULL, strdup(var_name), pos);
            Node *add = node_new(NODE_ADD, lookup, one_node, NULL, pos);
            return node_new(NODE_VARIABLE_ASSIGN, add, NULL, var_name, pos);
        }
        
        if (tok->type == TOKEN_DECREASE) {
            advance(p);
            int *one = malloc(sizeof(int));
            *one = 1;
            Node *one_node = node_new(NODE_NUMBER, NULL, NULL, one, pos);
            Node *lookup = node_new(NODE_VARIABLE_LOOKUP, NULL, NULL, strdup(var_name), pos);
            Node *sub = node_new(NODE_SUBTRACT, lookup, one_node, NULL, pos);
            return node_new(NODE_VARIABLE_ASSIGN, sub, NULL, var_name, pos);
        }
        
        if (tok->type == TOKEN_LBRACKET) {
            advance(p);
            Node *index = parse_expression(p);
            expect(p, TOKEN_RBRACKET);
            advance(p);
            expect(p, TOKEN_ASSIGN);
            advance(p);
            Node *expr = parse_expression(p);
            return node_new(NODE_VARIABLE_ASSIGN_ARRAY, index, expr, var_name, pos);
        }
        
        // Expression statement
        reverse(p);
        Node *expr = parse_expression(p);
        return expr;
    }
    
    return NULL;
}

// Parse function parameters
static void parse_function_params(Parser *p, Variable **params, int *param_count) {
    *params = NULL;
    *param_count = 0;
    int capacity = 0;
    
    expect(p, TOKEN_LPAREN);
    advance(p);
    
    Token *tok = current_token(p);
    if (tok->type == TOKEN_RPAREN) {
        advance(p);
        return;
    }
    
    while (1) {
        Variable var = parse_datatype_named(p);
        
        if (*param_count >= capacity) {
            capacity = capacity == 0 ? 4 : capacity * 2;
            Variable *new_params = realloc(*params, capacity * sizeof(Variable));
            if (!new_params) {
                fprintf(stderr, "Fatal: memory allocation failed\n");
                exit(1);
            }
            *params = new_params;
        }
        (*params)[*param_count] = var;
        (*param_count)++;
        
        tok = current_token(p);
        if (tok->type == TOKEN_COMMA) {
            advance(p);
        } else if (tok->type == TOKEN_RPAREN) {
            advance(p);
            break;
        } else {
            parser_error(p, "Expected comma or )", tok->pos);
        }
    }
}

// Parse a function
static Node *parse_function(Parser *p) {
    int pos = current_token(p)->pos;
    int is_external = 0;
    
    // Skip 'function' keyword
    advance(p);
    
    // Check for function attributes in parentheses
    if (current_token(p)->type == TOKEN_LPAREN) {
        advance(p);  // skip '('
        
        // Parse attribute list (comma-separated identifiers)
        while (current_token(p)->type == TOKEN_ID) {
            char *attr = current_token(p)->value;
            
            // Check if it's 'external' attribute
            if (strcmp(attr, "external") == 0) {
                is_external = 1;
            }
            // Ignore other attributes like 'noreturn', 'keep', etc.
            
            advance(p);
            
            if (current_token(p)->type == TOKEN_COMMA) {
                advance(p);
            } else if (current_token(p)->type == TOKEN_RPAREN) {
                break;
            }
        }
        
        expect(p, TOKEN_RPAREN);
        advance(p);  // skip ')'
    }
    
    // Function name
    expect(p, TOKEN_ID);
    char *name = strdup(current_token(p)->value);
    advance(p);
    
    // Parameters
    Variable *params = NULL;
    int param_count = 0;
    parse_function_params(p, &params, &param_count);
    
    // Return type
    expect(p, TOKEN_ARROW);
    advance(p);
    
    Datatype return_type;
    int return_is_array;
    parse_datatype_unnamed(p, &return_type, &return_is_array);
    
    // Function body or semicolon for external functions
    Node **body = NULL;
    int body_count = 0;
    
    if (is_external) {
        // External function - expect semicolon (don't advance past it)
        expect(p, TOKEN_END_OF_LINE);
        // Don't advance - let the global parser handle it
    } else {
        // Regular function - parse body
        body = parse_code_block(p, &body_count);
        expect(p, TOKEN_RBRACE);
        // Don't advance - let the global parser handle it
    }
    
    // Create function structure
    Function *func = malloc(sizeof(Function));
    func->name = name;
    func->params = params;
    func->param_count = param_count;
    func->return_type = return_type;
    func->return_is_array = return_is_array;
    func->body = body;
    func->body_count = body_count;
    func->is_external = is_external;
    
    return node_new(NODE_FUNCTION, NULL, NULL, func, pos);
}

// Parser creation and destruction
Parser *parser_new(TokenList *tokens, char *code) {
    Parser *p = malloc(sizeof(Parser));
    p->tokens = tokens;
    p->code = code;
    p->pos = 0;
    return p;
}

void parser_free(Parser *parser) {
    if (parser) {
        free(parser);
    }
}

// Parse global scope
Node *parser_global(Parser *parser) {
    Node **global = NULL;
    int count = 0;
    int capacity = 0;
    
    while (current_token(parser) != NULL) {
        Token *tok = current_token(parser);
        
        // Stop at EOF
        if (tok->type == TOKEN_EOF) {
            break;
        }
        
        int pos = tok->pos;
        
        if (tok->type == TOKEN_ID) {
            // Global variable declaration
            if (is_datatype_string(tok->value)) {
                Variable var = parse_datatype_named(parser);
                tok = current_token(parser);
                
                Variable *var_ptr = malloc(sizeof(Variable));
                *var_ptr = var;
                
                Node *decl;
                if (tok->type == TOKEN_END_OF_LINE) {
                    decl = node_new(NODE_VARIABLE_DECLARATION, NULL, NULL, var_ptr, pos);
                } else {
                    expect(parser, TOKEN_ASSIGN);
                    advance(parser);
                    Node *expr = parse_expression(parser);
                    expect(parser, TOKEN_END_OF_LINE);
                    decl = node_new(NODE_VARIABLE_DECLARATION, expr, NULL, var_ptr, pos);
                }
                
                if (count >= capacity) {
                    capacity = capacity == 0 ? 8 : capacity * 2;
                    Node **new_global = realloc(global, capacity * sizeof(Node*));
                    if (!new_global) {
                        fprintf(stderr, "Fatal: memory allocation failed\n");
                        exit(1);
                    }
                    global = new_global;
                }
                global[count++] = decl;
            }
            // Function declaration
            else if (strcmp(tok->value, "function") == 0) {
                Node *func = parse_function(parser);
                
                if (count >= capacity) {
                    capacity = capacity == 0 ? 8 : capacity * 2;
                    Node **new_global = realloc(global, capacity * sizeof(Node*));
                    if (!new_global) {
                        fprintf(stderr, "Fatal: memory allocation failed\n");
                        exit(1);
                    }
                    global = new_global;
                }
                global[count++] = func;
            }
            // Offset (struct) declaration - parse and generate field offset constants
            else if (strcmp(tok->value, "offset") == 0) {
                // Skip 'offset' keyword
                advance(parser);
                expect(parser, TOKEN_ID);
                char *offset_name = strdup(current_token(parser)->value);
                advance(parser);
                
                // Parse the body to extract field names
                expect(parser, TOKEN_LBRACE);
                advance(parser);
                
                int current_offset = 0;
                while (current_token(parser) != NULL && current_token(parser)->type != TOKEN_RBRACE) {
                    Token *field_tok = current_token(parser);
                    
                    if (field_tok->type == TOKEN_ID && is_datatype_string(field_tok->value)) {
                        // Parse field declaration
                        Variable field_var = parse_datatype_named(parser);
                        
                        // Calculate size (simplified - assume all types are pointer-sized)
                        int field_size = 8;  // Assuming 64-bit pointers/ints
                        
                        // Create global constant for this field offset
                        char *field_const_name = malloc(strlen(offset_name) + strlen(field_var.name) + 2);
                        sprintf(field_const_name, "%s_%s", offset_name, field_var.name);
                        
                        Variable *const_var = malloc(sizeof(Variable));
                        const_var->name = field_const_name;
                        const_var->datatype = DATATYPE_INT;
                        const_var->is_array = 0;
                        
                        int *offset_value = malloc(sizeof(int));
                        *offset_value = current_offset;
                        Node *offset_node = node_new(NODE_NUMBER, NULL, NULL, offset_value, pos);
                        
                        Node *decl = node_new(NODE_VARIABLE_DECLARATION, offset_node, NULL, const_var, pos);
                        
                        if (count >= capacity) {
                            capacity = capacity == 0 ? 8 : capacity * 2;
                            Node **new_global = realloc(global, capacity * sizeof(Node*));
                            if (!new_global) {
                                fprintf(stderr, "Fatal: memory allocation failed\n");
                                exit(1);
                            }
                            global = new_global;
                        }
                        global[count++] = decl;
                        
                        current_offset += field_size;
                        
                        // Expect semicolon
                        expect(parser, TOKEN_END_OF_LINE);
                        advance(parser);
                        
                        free(field_var.name);
                    } else {
                        // Skip unknown tokens
                        advance(parser);
                    }
                }
                
                // Generate _size constant
                char *size_const_name = malloc(strlen(offset_name) + 6);  // "_size" + null
                sprintf(size_const_name, "%s_size", offset_name);
                
                Variable *size_var = malloc(sizeof(Variable));
                size_var->name = size_const_name;
                size_var->datatype = DATATYPE_INT;
                size_var->is_array = 0;
                
                int *size_value = malloc(sizeof(int));
                *size_value = current_offset;
                Node *size_node = node_new(NODE_NUMBER, NULL, NULL, size_value, pos);
                
                Node *size_decl = node_new(NODE_VARIABLE_DECLARATION, size_node, NULL, size_var, pos);
                
                if (count >= capacity) {
                    capacity = capacity == 0 ? 8 : capacity * 2;
                    Node **new_global = realloc(global, capacity * sizeof(Node*));
                    if (!new_global) {
                        fprintf(stderr, "Fatal: memory allocation failed\n");
                        exit(1);
                    }
                    global = new_global;
                }
                global[count++] = size_decl;
                
                expect(parser, TOKEN_RBRACE);
                // Don't advance past the closing brace - let the main loop handle it
                
                free(offset_name);
            }
            else {
                parser_error(parser, "Unexpected identifier at global scope", tok->pos);
            }
        } else {
            parser_error(parser, "Expected identifier", tok->pos);
        }
        
        advance(parser);
    }
    
    // Store global nodes array
    Node **global_array = malloc(sizeof(Node*) * (count + 1));
    for (int i = 0; i < count; i++) {
        global_array[i] = global[i];
    }
    global_array[count] = NULL; // Null terminator
    free(global);
    
    return node_new(NODE_GLOBAL, NULL, NULL, global_array, 0);
}

// Recursively free a node tree
void node_free(Node *node) {
    if (!node) {
        return;
    }
    
    // Free children
    node_free(node->a);
    node_free(node->b);
    
    // Free node-specific data
    switch (node->type) {
        case NODE_GLOBAL:
        case NODE_FUNCTION: {
            if (node->value) {
                if (node->type == NODE_GLOBAL) {
                    Node **nodes = (Node**)node->value;
                    for (int i = 0; nodes[i] != NULL; i++) {
                        node_free(nodes[i]);
                    }
                    free(nodes);
                } else {
                    Function *func = (Function*)node->value;
                    free(func->name);
                    
                    for (int i = 0; i < func->param_count; i++) {
                        free(func->params[i].name);
                    }
                    free(func->params);
                    
                    for (int i = 0; i < func->body_count; i++) {
                        node_free(func->body[i]);
                    }
                    free(func->body);
                    
                    free(func);
                }
            }
            break;
        }
        case NODE_VARIABLE_DECLARATION: {
            if (node->value) {
                Variable *var = (Variable*)node->value;
                free(var->name);
                free(var);
            }
            break;
        }
        case NODE_STRING:
        case NODE_VARIABLE_LOOKUP:
        case NODE_VARIABLE_ASSIGN: {
            if (node->value) {
                free(node->value);
            }
            break;
        }
        case NODE_FUNCTION_CALL: {
            if (node->value) {
                Node **call_data = (Node**)node->value;
                free(call_data[0]); // function name
                // Args are freed via node->a and node->b
                free(call_data);
            }
            break;
        }
        case NODE_IF: {
            if (node->value) {
                Node ***if_data = (Node***)node->value;
                Node **true_block = if_data[0];
                Node **false_block = if_data[1];
                int *counts = (int*)(if_data + 2);
                
                if (true_block) {
                    for (int i = 0; i < counts[0]; i++) {
                        node_free(true_block[i]);
                    }
                    free(true_block);
                }
                
                if (false_block) {
                    for (int i = 0; i < counts[1]; i++) {
                        node_free(false_block[i]);
                    }
                    free(false_block);
                }
                
                free(if_data);
            }
            break;
        }
        case NODE_CONDITIONAL_LOOP:
        case NODE_POST_CONDITIONAL_LOOP:
        case NODE_LOOP:
        case NODE_UPDATE_CONDITIONAL_LOOP: {
            if (node->value) {
                void *loop_data = node->value;
                int body_count = *(int*)loop_data;
                Node **nodes = (Node**)((char*)loop_data + sizeof(int));
                
                for (int i = 0; i < body_count; i++) {
                    node_free(nodes[i]);
                }
                free(loop_data);
            }
            break;
        }
        default:
            if (node->value) {
                free(node->value);
            }
            break;
    }
    
    free(node);
}
