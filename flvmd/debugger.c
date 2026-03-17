#include "debugger.h"
#include "../flvm/vm.h"

#include <stdint.h>
#include <stdio.h>
#include <string.h>

const char* names[] = {
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
    "change_sign"};

const char* instruction_name(uint8_t opcode) {
    if (opcode < sizeof(names)/sizeof(names[0]) && names[opcode]) {
        return names[opcode];
    }
    return "UNKNOWN";
}

const char* datatype_name(uint8_t dt) {
    switch (dt & ~(1 << 7)) {
        case INT: 
            return "int";
        case CHR: 
            return "chr";
        case STR: 
            return "str";
        case PTR: 
            return "ptr";
        case I16: 
            return "i16";
        case I32: 
            return "i32";
        default: 
            return "???";
    }
}

int instruction_length(struct debugger_state* state, uint64_t addr) {
    uint8_t opcode = read_u8(state->vm->code, addr);
    
    switch (opcode) {
        case GLOBAL_RESERVE:
        case VARIABLE:
            return 1 + 8 + 1 + 1; // opcode + idx + datatype + array
        case ASSIGN:
        case ASSIGN_INDEXED:
        case LOAD:
        case LOAD_INDEXED:
        case INCREASE:
        case DECREASE:
            return 1 + 8; // opcode + idx
        case NUMBER:
        case GOTO:
        case INVOKE:
        case INVOKE_NATIVE:
            return 1 + 8; // opcode + value/address
        case GOTO_TRUE:
        case GOTO_FALSE:
            return 1 + 8; // opcode + address
        case STRING: {
            uint64_t len = read_u64(state->vm->code, addr + 1);
            return 1 + 8 + len + 1; // opcode + len + string + null
        }
        case RETURN:
        case ADD:
        case SUB:
        case MUL:
        case DIV:
        case MOD:
        case LESS:
        case LESS_EQUALS:
        case MORE:
        case MORE_EQUALS:
        case EQUALS:
        case NOT_EQUALS:
        case INVERT:
        case SHIFT_LEFT:
        case SHIFT_RIGHT:
        case OR:
        case AND:
        case XOR:
        case NOT:
        case NORETURN:
        case DELETE:
        case CHANGE_SIGN:
            return 1; // just opcode
        default:
            return 1;
    }
}

void disassemble_instruction(struct debugger_state* state, uint64_t addr, char* buf, size_t buf_size) {
    uint8_t opcode = read_u8(state->vm->code, addr);
    
    switch (opcode) {
        case GLOBAL_RESERVE:
        case VARIABLE: {
            uint64_t idx = read_u64(state->vm->code, addr + 1);
            uint8_t dt = read_u8(state->vm->code, addr + 9);
            uint8_t arr = read_u8(state->vm->code, addr + 10);
            snprintf(buf, buf_size, "%-14s %lu %s%s", instruction_name(opcode), idx, datatype_name(dt), arr ? "[]" : "");
            break;
        }
        case ASSIGN:
        case LOAD:
        case INCREASE:
        case DECREASE: {
            uint64_t idx = read_u64(state->vm->code, addr + 1);
            snprintf(buf, buf_size, "%-14s %lu", instruction_name(opcode), idx);
            break;
        }
        case ASSIGN_INDEXED:
        case LOAD_INDEXED: {
            uint64_t idx = read_u64(state->vm->code, addr + 1);
            snprintf(buf, buf_size, "%-14s %lu", instruction_name(opcode), idx);
            break;
        }
        case NUMBER: {
            int64_t num = read_i64(state->vm->code, addr + 1);
            snprintf(buf, buf_size, "%-14s %ld (0x%lx)", instruction_name(opcode), num, num);
            break;
        }
        case STRING: {
            uint64_t len = read_u64(state->vm->code, addr + 1);
            char* str = (char*)state->vm->code + addr + 9;
            char truncated[128];
            if (len > state->code_panel_width - 20) {
                strncpy(truncated, str, state->code_panel_width - 20);
                truncated[state->code_panel_width - 20] = '\0';
                snprintf(buf, buf_size, "%-14s \"%s...\"", instruction_name(opcode), truncated);
            } else {
                snprintf(buf, buf_size, "%-14s \"%s\"", instruction_name(opcode), str);
            }
            break;
        }
        case GOTO:
        case INVOKE: {
            uint64_t loc = read_u64(state->vm->code, addr + 1);
            snprintf(buf, buf_size, "%-14s %lx", instruction_name(opcode), loc);
            break;
        }
        case GOTO_TRUE:
        case GOTO_FALSE: {
            uint64_t loc = read_u64(state->vm->code, addr + 1);
            snprintf(buf, buf_size, "%-14s %lx", instruction_name(opcode), loc);
            break;
        }
        case INVOKE_NATIVE: {
            uint64_t id = read_u64(state->vm->code, addr + 1);
            const char* name = "???";
            switch (id) {
                case 0: name = "exit"; break;
                case 1: name = "putchar"; break;
                case 2: name = "puts"; break;
                case 3: name = "malloc"; break;
                case 4: name = "free"; break;
                case 5: name = "fopen"; break;
                case 6: name = "fclose"; break;
                case 7: name = "fseek"; break;
                case 8: name = "fread"; break;
                case 9: name = "fwrite"; break;
                case 10: name = "ftell"; break;
            }
            snprintf(buf, buf_size, "%-14s %lu (%s)", instruction_name(opcode), id, name);
            break;
        }
        default:
            snprintf(buf, buf_size, "%s", instruction_name(opcode));
            break;
    }
}

void draw_box(int x, int y, int w, int h, const char* title) {
    ANSI_GOTO(x, y);
    printf(ANSI_FG_GRAY "#");
    if (title) {
        printf("#" ANSI_FG_WHITE " %s " ANSI_RESET ANSI_FG_GRAY, title);
        for (int i = strlen(title) + 4; i < w - 1; i++) {
            printf("#");
        }
    } else {
        for (int i = 0; i < w - 2; i++) {
            printf("#");
        }
    }
    printf("#" ANSI_RESET);
    
    for (int i = 1; i < h - 1; i++) {
        ANSI_GOTO(x, y + i);
        printf(ANSI_FG_GRAY "#" ANSI_RESET);
        ANSI_GOTO(x + w - 1, y + i);
        printf(ANSI_FG_GRAY "#" ANSI_RESET);
    }
    
    ANSI_GOTO(x, y + h - 1);
    printf(ANSI_FG_GRAY "#");
    for (int i = 0; i < w - 2; i++) {
        printf("#");
    }
    printf("#" ANSI_RESET);
}

void debugger_init(struct debugger_state* state, struct vm_instance* vm) {
    memset(state, 0, sizeof(struct debugger_state));
    state->vm = vm;
}

void debugger_draw(struct debugger_state* state) {
    printf(ANSI_CLEAR ANSI_HOME);
    
    printf(" FLVM Debugger");
    for (int i = 14; i < state->width; i++) {
        printf(" ");
    }
    printf(ANSI_RESET "\n");
    
    draw_box(1, 2, state->code_panel_width, state->code_panel_height, "Code");
    
    uint64_t display_start = state->vm->counter;
    
    int max_lines = state->code_panel_height - 2;
    uint64_t addr = display_start;
    
    for (int i = 0; i < max_lines && addr < state->vm->code_size; i++) {
        char disasm[64];
        disassemble_instruction(state, addr, disasm, sizeof(disasm));
        int len = instruction_length(state, addr);
        
        ANSI_GOTO(2, 3 + i);
        
        if (addr == state->vm->counter) {
            printf(ANSI_BG_BLUE ANSI_FG_WHITE);
            printf(" %04lx: %-42s", addr, disasm);
            printf(ANSI_RESET);
        } else {
            printf(ANSI_FG_YELLOW " %04lx: " ANSI_RESET, addr);
            printf("%-42s", disasm);
        }
        
        addr += len;
    }
    
    // Stack panel
    draw_box(state->code_panel_width + 1, 2, state->stack_panel_width, state->stack_panel_height, "Stack");
    
    int stack_lines = state->stack_panel_height - 2;
    int stack_start = state->vm->stack_ptr > stack_lines ? state->vm->stack_ptr - stack_lines : 0;
    
    for (int i = 0; i < stack_lines; i++) {
        ANSI_GOTO(state->code_panel_width + 2, 3 + i);
        int idx = stack_start + i;
        if (idx < state->vm->stack_ptr) {
            int64_t val = state->vm->stack[idx];
            if (idx == state->vm->stack_ptr - 1) {
                printf(ANSI_FG_GREEN "[%2d] %ld" ANSI_RESET, idx, val);
            } else {
                printf(ANSI_FG_GREEN "[%2d] " ANSI_RESET "%ld", idx, val);
            }
        }
    }
    
    // Variables panel
    draw_box(1, state->code_panel_height + 2, state->vars_panel_width + 1, state->vars_panel_height, "Local Variables");
    
    int var_line = 0;
    int var_col = 0;
    int max_var_lines = state->vars_panel_height - 2;
    
    for (int i = 0; i < 256 && var_line < max_var_lines; i++) {
        if (state->vm->call_stack[state->vm->call_depth].variable_types[i] != 0 || state->vm->call_stack[state->vm->call_depth].variables[i] != 0) {
            ANSI_GOTO(2 + var_col * 24, state->code_panel_height + 3 + var_line);
            printf(ANSI_FG_MAGENTA "%d" ANSI_RESET "=", i);
            printf("%ld", state->vm->call_stack[state->vm->call_depth].variables[i]);
            
            var_col++;
            if (var_col >= 2) {
                var_col = 0;
                var_line++;
            }
        }
    }
    
    // Global variables panel
    draw_box(state->code_panel_width + 1, state->code_panel_height + 2, state->stack_panel_width, state->vars_panel_height, "Globals");
    
    var_line = 0;
    for (int i = 0; i < state->vm->global_variable_size && var_line < state->vars_panel_height - 2; i++) {
        ANSI_GOTO(state->code_panel_width + 2, state->code_panel_height + 3 + var_line);
        printf(ANSI_FG_CYAN "%d" ANSI_RESET "=%ld", i, state->vm->global_variables[i]);
        var_line++;
    }
    
    // Status bar
    ANSI_GOTO(1, state->height);
    printf("Program counter:%04lx  Stack pointer:%d  Call depth:%d ", state->vm->counter, state->vm->stack_ptr, state->vm->call_depth);

    printf(ANSI_RESET);
    
    fflush(stdout);
}

int64_t dbg_stack_pop(struct debugger_state* state) {
    return state->vm->stack[--state->vm->stack_ptr];
}

void dbg_stack_push(struct debugger_state* state, int64_t value) {
    state->vm->stack[state->vm->stack_ptr++] = value;
}


bool debugger_handle_input(struct debugger_state* state) {
    char c = getchar();
    
    switch (c) {
        case '\n':
            step(state->vm);
            break;
    }
    
    return true;
}

void debugger_run(struct debugger_state* state, uint64_t location) {
    memset(&state->vm->call_stack[state->vm->call_depth], 0, sizeof(struct call_frame));
    state->vm->counter = location;
    state->vm->running = true;

    while (state->vm->running) {
        debugger_draw(state);
        
        if (!debugger_handle_input(state)) {
            break;
        }
    }
    
    printf(ANSI_CLEAR ANSI_HOME);
    printf("Debugger terminated.\n");
}
