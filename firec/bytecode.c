#define _POSIX_C_SOURCE 200809L
#include "bytecode.h"
#include "lexer.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define INITIAL_BUFFER_SIZE 4096

typedef struct {
    char *code;
    char *name;
    char **used_functions;
    int used_count;
    int used_capacity;
    int keep;
    char *exit_label;
} CompiledFunction;

typedef struct {
    char *buffer;
    size_t size;
    size_t capacity;
} StringBuilder;

static StringBuilder *sb_new() {
    StringBuilder *sb = malloc(sizeof(StringBuilder));
    sb->capacity = INITIAL_BUFFER_SIZE;
    sb->size = 0;
    sb->buffer = malloc(sb->capacity);
    sb->buffer[0] = '\0';
    return sb;
}

static void sb_append(StringBuilder *sb, const char *str) {
    size_t len = strlen(str);
    while (sb->size + len + 1 > sb->capacity) {
        sb->capacity *= 2;
        sb->buffer = realloc(sb->buffer, sb->capacity);
    }
    strcpy(sb->buffer + sb->size, str);
    sb->size += len;
}

static char *sb_to_string(StringBuilder *sb) {
    char *result = strdup(sb->buffer);
    free(sb->buffer);
    free(sb);
    return result;
}

static CompiledFunction *cf_new(const char *name, const char *exit_label) {
    CompiledFunction *cf = malloc(sizeof(CompiledFunction));
    cf->name = strdup(name);
    cf->exit_label = strdup(exit_label);
    cf->code = NULL;
    cf->used_functions = NULL;
    cf->used_count = 0;
    cf->used_capacity = 0;
    cf->keep = 0;
    return cf;
}

static void cf_use(CompiledFunction *cf, const char *name) {
    for (int i = 0; i < cf->used_count; i++) {
        if (strcmp(cf->used_functions[i], name) == 0) {
            return;
        }
    }
    
    if (cf->used_count >= cf->used_capacity) {
        cf->used_capacity = cf->used_capacity == 0 ? 4 : cf->used_capacity * 2;
        cf->used_functions = realloc(cf->used_functions, cf->used_capacity * sizeof(char*));
    }
    cf->used_functions[cf->used_count++] = strdup(name);
}

static void cf_free(CompiledFunction *cf) {
    if (cf->name) free(cf->name);
    if (cf->exit_label) free(cf->exit_label);
    if (cf->code) free(cf->code);
    for (int i = 0; i < cf->used_count; i++) {
        free(cf->used_functions[i]);
    }
    if (cf->used_functions) free(cf->used_functions);
    free(cf);
}

typedef struct {
    Node *global;
    char *code;
    int label_counter;
    CompiledFunction **compiled_functions;
    int cf_count;
    int cf_capacity;
} BytecodeInternal;

Bytecode *bytecode_new(Node *global, char *code) {
    Bytecode *bc = malloc(sizeof(Bytecode));
    bc->global = global;
    bc->code = code;
    bc->label_counter = 0;
    return bc;
}

void bytecode_free(Bytecode *bytecode) {
    free(bytecode);
}

static char *get_label(BytecodeInternal *bi) {
    char buffer[32];
    snprintf(buffer, sizeof(buffer), "%d", bi->label_counter++);
    return strdup(buffer);
}

static const char *datatype_to_string(Datatype dt) {
    switch (dt) {
        case DATATYPE_INT: return "int";
        case DATATYPE_STR: return "str";
        case DATATYPE_VOID: return "void";
        case DATATYPE_CHR: return "chr";
        case DATATYPE_PTR: return "ptr";
        case DATATYPE_INT_32: return "i32";
        case DATATYPE_INT_16: return "i16";
        default: return "unknown";
    }
}

static const char *compare_to_string(int token_type) {
    switch (token_type) {
        case TOKEN_MORE: return "more";
        case TOKEN_LESS: return "less";
        case TOKEN_MORE_EQUALS: return "more_equals";
        case TOKEN_LESS_EQUALS: return "less_equals";
        case TOKEN_EQUALS: return "equals";
        case TOKEN_NOT_EQUALS: return "not_equals";
        default: return "unknown";
    }
}

static char *encode_string(const char *str) {
    size_t len = strlen(str);
    // Allocate worst case: each character could become 2 chars, plus null terminator
    char *result = malloc(len * 2 + 1);
    char *p = result;
    
    for (size_t i = 0; i < len; i++) {
        switch (str[i]) {
            case '"':
                *p++ = '\\'; *p++ = '"';
                break;
            case '\n':
                *p++ = '\\'; *p++ = 'n';
                break;
            case '\r':
                *p++ = '\\'; *p++ = 'r';
                break;
            case '\t':
                *p++ = '\\'; *p++ = 't';
                break;
            case '\b':
                *p++ = '\\'; *p++ = 'b';
                break;
            default:
                *p++ = str[i];
        }
    }
    *p = '\0';
    return result;
}

// Evaluate a constant expression at compile time
// Returns 1 if successful, 0 if expression is not constant
static int eval_const_expr(Node *expr, long long *result) {
    if (!expr) return 0;
    
    switch (expr->type) {
        case NODE_NUMBER: {
            *result = *(int*)expr->value;
            return 1;
        }
        
        case NODE_ADD:
        case NODE_SUBTRACT:
        case NODE_MULTIPLY:
        case NODE_DIVIDE:
        case NODE_MODULO:
        case NODE_AND:
        case NODE_OR:
        case NODE_XOR:
        case NODE_SHIFT_LEFT:
        case NODE_SHIFT_RIGHT: {
            long long left, right;
            if (!eval_const_expr(expr->a, &left)) return 0;
            if (!eval_const_expr(expr->b, &right)) return 0;
            
            switch (expr->type) {
                case NODE_ADD: *result = left + right; return 1;
                case NODE_SUBTRACT: *result = left - right; return 1;
                case NODE_MULTIPLY: *result = left * right; return 1;
                case NODE_DIVIDE:
                    if (right == 0) return 0;
                    *result = left / right;
                    return 1;
                case NODE_MODULO:
                    if (right == 0) return 0;
                    *result = left % right;
                    return 1;
                case NODE_AND: *result = left & right; return 1;
                case NODE_OR: *result = left | right; return 1;
                case NODE_XOR: *result = left ^ right; return 1;
                case NODE_SHIFT_LEFT: *result = left << right; return 1;
                case NODE_SHIFT_RIGHT: *result = left >> right; return 1;
                default: return 0;
            }
        }
        
        case NODE_COMPARE: {
            long long left, right;
            if (!eval_const_expr(expr->a, &left)) return 0;
            if (!eval_const_expr(expr->b, &right)) return 0;
            
            int *op = (int*)expr->value;
            switch (*op) {
                case TOKEN_LESS: *result = left < right ? 1 : 0; return 1;
                case TOKEN_LESS_EQUALS: *result = left <= right ? 1 : 0; return 1;
                case TOKEN_MORE: *result = left > right ? 1 : 0; return 1;
                case TOKEN_MORE_EQUALS: *result = left >= right ? 1 : 0; return 1;
                case TOKEN_EQUALS: *result = left == right ? 1 : 0; return 1;
                case TOKEN_NOT_EQUALS: *result = left != right ? 1 : 0; return 1;
                default: return 0;
            }
        }
        
        case NODE_PLUS:
        case NODE_MINUS:
        case NODE_NOT:
        case NODE_BIT_NOT: {
            // Unary operators
            long long operand;
            if (!eval_const_expr(expr->a, &operand)) return 0;
            
            switch (expr->type) {
                case NODE_PLUS: *result = operand; return 1;
                case NODE_MINUS: *result = -operand; return 1;
                case NODE_NOT: *result = !operand ? 1 : 0; return 1;
                case NODE_BIT_NOT: *result = ~operand; return 1;
                default: return 0;
            }
        }
        
        default:
            return 0;
    }
}

static Node *resolve_function(BytecodeInternal *bi, const char *name) {
    if (bi->global->type != NODE_GLOBAL) {
        return NULL;
    }
    
    Node **nodes = (Node**)bi->global->value;
    
    for (int i = 0; nodes[i] != NULL; i++) {
        if (nodes[i]->type == NODE_FUNCTION) {
            Function *f = (Function*)nodes[i]->value;
            if (strcmp(f->name, name) == 0) {
                return nodes[i];
            }
        }
    }
    return NULL;
}

static void generate_expression(BytecodeInternal *bi, Node *exp, CompiledFunction *cf, StringBuilder *sb);

static void generate_expression(BytecodeInternal *bi, Node *exp, CompiledFunction *cf, StringBuilder *sb) {
    char buffer[256];
    
    if (!exp) return;
    
    switch (exp->type) {
        case NODE_NUMBER:
            snprintf(buffer, sizeof(buffer), "\tnumber %d\n", *(int*)exp->value);
            sb_append(sb, buffer);
            break;
            
        case NODE_STRING: {
            char *encoded = encode_string((char*)exp->value);
            snprintf(buffer, sizeof(buffer), "\tstring \"%s\"\n", encoded);
            sb_append(sb, buffer);
            free(encoded);
            break;
        }
            
        case NODE_COMPARE:
            generate_expression(bi, exp->a, cf, sb);
            generate_expression(bi, exp->b, cf, sb);
            snprintf(buffer, sizeof(buffer), "\t%s\n", compare_to_string(*(int*)exp->value));
            sb_append(sb, buffer);
            break;
            
        case NODE_NOT:
            generate_expression(bi, exp->a, cf, sb);
            sb_append(sb, "\tinvert\n");
            break;
            
        case NODE_ADD:
            generate_expression(bi, exp->a, cf, sb);
            generate_expression(bi, exp->b, cf, sb);
            sb_append(sb, "\tadd\n");
            break;
            
        case NODE_SUBTRACT:
            generate_expression(bi, exp->a, cf, sb);
            generate_expression(bi, exp->b, cf, sb);
            sb_append(sb, "\tsub\n");
            break;
            
        case NODE_MULTIPLY:
            generate_expression(bi, exp->a, cf, sb);
            generate_expression(bi, exp->b, cf, sb);
            sb_append(sb, "\tmul\n");
            break;
            
        case NODE_DIVIDE:
            generate_expression(bi, exp->a, cf, sb);
            generate_expression(bi, exp->b, cf, sb);
            sb_append(sb, "\tdiv\n");
            break;
            
        case NODE_MODULO:
            generate_expression(bi, exp->a, cf, sb);
            generate_expression(bi, exp->b, cf, sb);
            sb_append(sb, "\tmod\n");
            break;
            
        case NODE_OR:
            generate_expression(bi, exp->a, cf, sb);
            generate_expression(bi, exp->b, cf, sb);
            sb_append(sb, "\tor\n");
            break;
            
        case NODE_AND:
            generate_expression(bi, exp->a, cf, sb);
            generate_expression(bi, exp->b, cf, sb);
            sb_append(sb, "\tand\n");
            break;
            
        case NODE_XOR:
            generate_expression(bi, exp->a, cf, sb);
            generate_expression(bi, exp->b, cf, sb);
            sb_append(sb, "\txor\n");
            break;
            
        case NODE_BIT_NOT:
            generate_expression(bi, exp->a, cf, sb);
            sb_append(sb, "\tnot\n");
            break;
            
        case NODE_SHIFT_LEFT:
            generate_expression(bi, exp->a, cf, sb);
            generate_expression(bi, exp->b, cf, sb);
            sb_append(sb, "\tshift_left\n");
            break;
            
        case NODE_SHIFT_RIGHT:
            generate_expression(bi, exp->a, cf, sb);
            generate_expression(bi, exp->b, cf, sb);
            sb_append(sb, "\tshift_right\n");
            break;
            
        case NODE_FUNCTION_CALL: {
            Node **call_data = (Node**)exp->value;
            char *func_name = (char*)call_data[0];
            
            cf_use(cf, func_name);
            
            Node *fn = resolve_function(bi, func_name);
            if (fn) {
                Function *func = (Function*)fn->value;
                
                // Generate arguments (stored from index 1 onwards)
                for (int i = 0; i < func->param_count; i++) {
                    generate_expression(bi, call_data[i + 1], cf, sb);
                }
                
                snprintf(buffer, sizeof(buffer), "\tinvoke %s\n", func_name);
                sb_append(sb, buffer);
            }
            break;
        }
            
        case NODE_VARIABLE_LOOKUP:
            snprintf(buffer, sizeof(buffer), "\tload %s\n", (char*)exp->value);
            sb_append(sb, buffer);
            break;
            
        case NODE_VARIABLE_LOOKUP_ARRAY:
            generate_expression(bi, exp->a, cf, sb);
            snprintf(buffer, sizeof(buffer), "\tload_indexed %s\n", (char*)exp->value);
            sb_append(sb, buffer);
            break;
            
        case NODE_MINUS:
            generate_expression(bi, exp->a, cf, sb);
            sb_append(sb, "\tchange_sign\n");
            break;
            
        default:
            break;
    }
}

static void generate_code_block(BytecodeInternal *bi, Node **block, int count, CompiledFunction *cf, 
                                 const char *current_continue, const char *current_break, StringBuilder *sb);

static void generate_code_block(BytecodeInternal *bi, Node **block, int count, CompiledFunction *cf,
                                 const char *current_continue, const char *current_break, StringBuilder *sb) {
    char buffer[256];
    
    for (int i = 0; i < count; i++) {
        Node *node = block[i];
        
        switch (node->type) {
            case NODE_VARIABLE_DECLARATION: {
                Variable *var = (Variable*)node->value;
                snprintf(buffer, sizeof(buffer), "\tvariable %s %s %s\n", 
                        var->name, datatype_to_string(var->datatype), 
                        var->is_array ? "true" : "false");
                sb_append(sb, buffer);
                
                if (node->a) {
                    generate_expression(bi, node->a, cf, sb);
                    snprintf(buffer, sizeof(buffer), "\tassign %s\n", var->name);
                    sb_append(sb, buffer);
                }
                break;
            }
                
            case NODE_VARIABLE_ASSIGN:
                if (node->a) {
                    generate_expression(bi, node->a, cf, sb);
                    snprintf(buffer, sizeof(buffer), "\tassign %s\n", (char*)node->value);
                    sb_append(sb, buffer);
                }
                break;
                
            case NODE_VARIABLE_ASSIGN_ARRAY:
                generate_expression(bi, node->a, cf, sb);
                generate_expression(bi, node->b, cf, sb);
                snprintf(buffer, sizeof(buffer), "\tassign_indexed %s\n", (char*)node->value);
                sb_append(sb, buffer);
                break;
                
            case NODE_FUNCTION_CALL: {
                Node **call_data = (Node**)node->value;
                char *func_name = (char*)call_data[0];
                
                cf_use(cf, func_name);
                
                Node *fn = resolve_function(bi, func_name);
                if (fn) {
                    Function *func = (Function*)fn->value;
                    
                    for (int j = 0; j < func->param_count; j++) {
                        generate_expression(bi, call_data[j + 1], cf, sb);
                    }
                    
                    snprintf(buffer, sizeof(buffer), "\tinvoke %s\n", func_name);
                    sb_append(sb, buffer);
                }
                sb_append(sb, "\tdelete\n");
                break;
            }
                
            case NODE_RETURN:
                if (node->a) {
                    generate_expression(bi, node->a, cf, sb);
                } else {
                    sb_append(sb, "\tnumber 0\n");
                }
                snprintf(buffer, sizeof(buffer), "\tgoto %s\n", cf->exit_label);
                sb_append(sb, buffer);
                break;
                
            case NODE_IF: {
                generate_expression(bi, node->a, cf, sb);
                
                Node ***if_data = (Node***)node->value;
                Node **true_block = if_data[0];
                Node **false_block = if_data[1];
                int *counts = (int*)(if_data + 2);
                int true_count = counts[0];
                int false_count = counts[1];
                
                char *label = get_label(bi);
                
                if (false_block) {
                    char *label2 = get_label(bi);
                    snprintf(buffer, sizeof(buffer), "\tgoto_false %s\n", label);
                    sb_append(sb, buffer);
                    generate_code_block(bi, true_block, true_count, cf, current_continue, current_break, sb);
                    snprintf(buffer, sizeof(buffer), "\tgoto %s\n", label2);
                    sb_append(sb, buffer);
                    snprintf(buffer, sizeof(buffer), "%s:\n", label);
                    sb_append(sb, buffer);
                    generate_code_block(bi, false_block, false_count, cf, current_continue, current_break, sb);
                    snprintf(buffer, sizeof(buffer), "%s:\n", label2);
                    sb_append(sb, buffer);
                    free(label2);
                } else {
                    snprintf(buffer, sizeof(buffer), "\tgoto_false %s\n", label);
                    sb_append(sb, buffer);
                    generate_code_block(bi, true_block, true_count, cf, current_continue, current_break, sb);
                    snprintf(buffer, sizeof(buffer), "%s:\n", label);
                    sb_append(sb, buffer);
                }
                free(label);
                break;
            }
                
            case NODE_CONDITIONAL_LOOP: {
                char *loop_back = get_label(bi);
                char *loop_exit = get_label(bi);
                
                snprintf(buffer, sizeof(buffer), "%s:\n", loop_back);
                sb_append(sb, buffer);
                generate_expression(bi, node->a, cf, sb);
                snprintf(buffer, sizeof(buffer), "\tgoto_false %s\n", loop_exit);
                sb_append(sb, buffer);
                
                void *loop_data = node->value;
                int loop_count = *(int*)loop_data;
                Node **loop_block = (Node**)((char*)loop_data + sizeof(int));
                generate_code_block(bi, loop_block, loop_count, cf, loop_back, loop_exit, sb);
                
                snprintf(buffer, sizeof(buffer), "\tgoto %s\n", loop_back);
                sb_append(sb, buffer);
                snprintf(buffer, sizeof(buffer), "%s:\n", loop_exit);
                sb_append(sb, buffer);
                
                free(loop_back);
                free(loop_exit);
                break;
            }
            
            case NODE_UPDATE_CONDITIONAL_LOOP: {
                // For loop: init; condition; update { body }
                char *loop_back = get_label(bi);
                char *loop_continue = get_label(bi);  // Continue goes to update
                char *loop_exit = get_label(bi);
                
                // Execute init (first node in loop_data)
                void *loop_data = node->value;
                int loop_count = *(int*)loop_data;
                Node **loop_nodes = (Node**)((char*)loop_data + sizeof(int));
                
                // Generate init statement (call code_block with single statement)
                if (loop_nodes[0]) {
                    Node *init_nodes[1] = {loop_nodes[0]};
                    generate_code_block(bi, init_nodes, 1, cf, NULL, NULL, sb);
                }
                
                // Loop start: check condition
                snprintf(buffer, sizeof(buffer), "%s:\n", loop_back);
                sb_append(sb, buffer);
                generate_expression(bi, node->a, cf, sb);  // condition
                snprintf(buffer, sizeof(buffer), "\tgoto_false %s\n", loop_exit);
                sb_append(sb, buffer);
                
                // Generate loop body (nodes after init)
                generate_code_block(bi, &loop_nodes[1], loop_count - 1, cf, loop_continue, loop_exit, sb);
                
                // Continue label: execute update and jump back
                snprintf(buffer, sizeof(buffer), "%s:\n", loop_continue);
                sb_append(sb, buffer);
                if (node->b) {  // update statement
                    Node *update_nodes[1] = {node->b};
                    generate_code_block(bi, update_nodes, 1, cf, NULL, NULL, sb);
                }
                snprintf(buffer, sizeof(buffer), "\tgoto %s\n", loop_back);
                sb_append(sb, buffer);
                
                // Exit label
                snprintf(buffer, sizeof(buffer), "%s:\n", loop_exit);
                sb_append(sb, buffer);
                
                free(loop_back);
                free(loop_continue);
                free(loop_exit);
                break;
            }
                
            case NODE_POST_CONDITIONAL_LOOP: {
                char *loop_back = get_label(bi);
                char *loop_exit = get_label(bi);
                
                snprintf(buffer, sizeof(buffer), "%s:\n", loop_back);
                sb_append(sb, buffer);
                
                void *loop_data = node->value;
                int loop_count = *(int*)loop_data;
                Node **loop_block = (Node**)((char*)loop_data + sizeof(int));
                generate_code_block(bi, loop_block, loop_count, cf, loop_back, loop_exit, sb);
                
                generate_expression(bi, node->a, cf, sb);
                snprintf(buffer, sizeof(buffer), "\tgoto_true %s\n", loop_back);
                sb_append(sb, buffer);
                snprintf(buffer, sizeof(buffer), "%s:\n", loop_exit);
                sb_append(sb, buffer);
                
                free(loop_back);
                free(loop_exit);
                break;
            }
                
            case NODE_LOOP: {
                char *loop_back = get_label(bi);
                char *loop_exit = get_label(bi);
                
                snprintf(buffer, sizeof(buffer), "%s:\n", loop_back);
                sb_append(sb, buffer);
                
                void *loop_data = node->value;
                int loop_count = *(int*)loop_data;
                Node **loop_block = (Node**)((char*)loop_data + sizeof(int));
                generate_code_block(bi, loop_block, loop_count, cf, loop_back, loop_exit, sb);
                
                snprintf(buffer, sizeof(buffer), "\tgoto %s\n", loop_back);
                sb_append(sb, buffer);
                snprintf(buffer, sizeof(buffer), "%s:\n", loop_exit);
                sb_append(sb, buffer);
                
                free(loop_back);
                free(loop_exit);
                break;
            }
                
            case NODE_CONTINUE:
                if (current_continue) {
                    snprintf(buffer, sizeof(buffer), "\tgoto %s\n", current_continue);
                    sb_append(sb, buffer);
                }
                break;
                
            case NODE_BREAK:
                if (current_break) {
                    snprintf(buffer, sizeof(buffer), "\tgoto %s\n", current_break);
                    sb_append(sb, buffer);
                }
                break;
                
            case NODE_END:
                // End block - for now, just generate the code inline
                // (not implementing full defer semantics)
                if (block[i]->value) {
                    Node **end_body = (Node**)block[i]->value;
                    int end_count = 0;
                    while (end_body[end_count] != NULL) {
                        end_count++;
                    }
                    generate_code_block(bi, end_body, end_count, cf, current_continue, current_break, sb);
                }
                break;
                
            default:
                break;
        }
    }
}

static CompiledFunction *generate_function(BytecodeInternal *bi, Function *f) {
    char *exit_label = get_label(bi);
    CompiledFunction *cf = cf_new(f->name, exit_label);
    
    StringBuilder *sb = sb_new();
    char buffer[256];
    
    snprintf(buffer, sizeof(buffer), "@begin function %s\n", f->name);
    sb_append(sb, buffer);
    snprintf(buffer, sizeof(buffer), "%s:\n", f->name);
    sb_append(sb, buffer);
    
    // Generate parameters in reverse order
    for (int i = f->param_count - 1; i >= 0; i--) {
        Variable *param = &f->params[i];
        snprintf(buffer, sizeof(buffer), "\tvariable %s %s %s\n", 
                param->name, datatype_to_string(param->datatype),
                param->is_array ? "true" : "false");
        sb_append(sb, buffer);
        snprintf(buffer, sizeof(buffer), "\tassign %s\n", param->name);
        sb_append(sb, buffer);
    }
    
    // Generate function body
    generate_code_block(bi, f->body, f->body_count, cf, NULL, NULL, sb);
    
    // Generate exit code
    sb_append(sb, "\tnumber 0\n");
    snprintf(buffer, sizeof(buffer), "%s:\n", exit_label);
    sb_append(sb, buffer);
    sb_append(sb, "\treturn\n");
    
    snprintf(buffer, sizeof(buffer), "@end function\n");
    sb_append(sb, buffer);
    
    cf->code = sb_to_string(sb);
    free(exit_label);
    
    return cf;
}

static void keep_function(BytecodeInternal *bi, const char *name) {
    for (int i = 0; i < bi->cf_count; i++) {
        CompiledFunction *cf = bi->compiled_functions[i];
        if (strcmp(cf->name, name) == 0) {
            if (cf->keep) {
                return;
            }
            cf->keep = 1;
            for (int j = 0; j < cf->used_count; j++) {
                keep_function(bi, cf->used_functions[j]);
            }
            return;
        }
    }
}

char *bytecode_compile(Bytecode *bc) {
    BytecodeInternal bi;
    bi.global = bc->global;
    bi.code = bc->code;
    bi.label_counter = bc->label_counter;
    bi.compiled_functions = NULL;
    bi.cf_count = 0;
    bi.cf_capacity = 0;
    
    StringBuilder *sb = sb_new();
    
    if (bi.global->type != NODE_GLOBAL) {
        return sb_to_string(sb);
    }
    
    Node **nodes = (Node**)bi.global->value;
    
    // Generate global section
    sb_append(sb, "@begin global global\n");
    
    // Generate global variable declarations
    for (int i = 0; nodes[i] != NULL; i++) {
        if (nodes[i]->type == NODE_VARIABLE_DECLARATION) {
            Variable *var = (Variable*)nodes[i]->value;
            char buffer[256];
            
            // Get datatype name
            const char *type_name;
            switch (var->datatype) {
                case DATATYPE_INT: type_name = "int"; break;
                case DATATYPE_CHR: type_name = "chr"; break;
                case DATATYPE_STR: type_name = "str"; break;
                case DATATYPE_PTR: type_name = "ptr"; break;
                case DATATYPE_INT_32: type_name = "int"; break;
                case DATATYPE_INT_16: type_name = "int"; break;
                default: type_name = "int"; break;
            }
            
            if (nodes[i]->a != NULL) {
                // Global with initialization
                long long const_value;
                if (eval_const_expr(nodes[i]->a, &const_value)) {
                    // Constant expression successfully evaluated
                    snprintf(buffer, sizeof(buffer), "global %s %s %lld\n", 
                            var->name, type_name, const_value);
                    sb_append(sb, buffer);
                } else if (nodes[i]->a->type == NODE_STRING) {
                    // String initialization
                    char *str_value = encode_string((char*)nodes[i]->a->value);
                    snprintf(buffer, sizeof(buffer), "global %s %s \"%s\"\n", 
                            var->name, type_name, str_value);
                    sb_append(sb, buffer);
                    free(str_value);
                } else {
                    // Complex non-constant initialization - just reserve
                    snprintf(buffer, sizeof(buffer), "global_reserve %s %s false\n", 
                            var->name, type_name);
                    sb_append(sb, buffer);
                }
            } else {
                // Global without initialization
                if (var->is_array) {
                    // Arrays must be reserved, not initialized with 0
                    snprintf(buffer, sizeof(buffer), "global_reserve %s %s true\n", 
                            var->name, type_name);
                } else {
                    // Non-arrays get default value 0
                    snprintf(buffer, sizeof(buffer), "global %s %s 0\n", 
                            var->name, type_name);
                }
                sb_append(sb, buffer);
            }
        }
    }
    
    sb_append(sb, "@end global\n");
    
    // Generate functions
    for (int i = 0; nodes[i] != NULL; i++) {
        if (nodes[i]->type == NODE_FUNCTION) {
            Function *f = (Function*)nodes[i]->value;
            
            // For external functions, generate a stub that calls invoke_native
            if (f->is_external) {
                char buffer[1024];
                snprintf(buffer, sizeof(buffer), "@begin function %s\n%s:\n\tinvoke_native %s\n\treturn\n@end function\n",
                        f->name, f->name, f->name);
                sb_append(sb, buffer);
                continue;
            }
            
            CompiledFunction *cf = generate_function(&bi, f);
            
            if (bi.cf_count >= bi.cf_capacity) {
                bi.cf_capacity = bi.cf_capacity == 0 ? 4 : bi.cf_capacity * 2;
                bi.compiled_functions = realloc(bi.compiled_functions, 
                                                bi.cf_capacity * sizeof(CompiledFunction*));
            }
            bi.compiled_functions[bi.cf_count++] = cf;
        }
    }
    
    // Mark functions to keep
    keep_function(&bi, "spark");
    
    // Append all functions (dead code elimination disabled for compatibility)
    for (int i = 0; i < bi.cf_count; i++) {
        sb_append(sb, bi.compiled_functions[i]->code);
    }
    
    // Clean up
    for (int i = 0; i < bi.cf_count; i++) {
        cf_free(bi.compiled_functions[i]);
    }
    if (bi.compiled_functions) {
        free(bi.compiled_functions);
    }
    
    bc->label_counter = bi.label_counter;
    return sb_to_string(sb);
}
