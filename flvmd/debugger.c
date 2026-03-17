#include "debugger.h"
#include "../flvm/vm.h"

#include <stdio.h>
#include <string.h>

const char* names[] = {
    [GLOBAL_RESERVE] = "global_reserve",
    [ASSIGN] = "assign",
    [ASSIGN_INDEXED] = "assign_indexed",
    [LOAD] = "load",
    [LOAD_INDEXED] = "load_indexed",
    [NUMBER] = "number",
    [STRING] = "string",
    [GOTO] = "goto",
    [GOTO_TRUE] = "goto_true",
    [GOTO_FALSE] = "goto_false",
    [INVOKE] = "invoke",
    [INVOKE_NATIVE] = "invoke_native",
    [RETURN] = "return",
    [VARIABLE] = "variable",
    [INCREASE] = "increase",
    [DECREASE] = "decrease",
    [ADD] = "add",
    [SUB] = "sub",
    [MUL] = "mul",
    [DIV] = "div",
    [MOD] = "mod",
    [LESS] = "less",
    [LESS_EQUALS] = "less_equals",
    [MORE] = "more",
    [MORE_EQUALS] = "more_equals",
    [EQUALS] = "equals",
    [NOT_EQUALS] = "not_equals",
    [INVERT] = "invert",
    [SHIFT_LEFT] = "shift_left",
    [SHIFT_RIGHT] = "shift_right",
    [OR] = "or",
    [AND] = "and",
    [XOR] = "xor",
    [NOT] = "not",
    [NORETURN] = "no_return",
    [DELETE] = "delete",
    [CHANGE_SIGN] = "change_sign"
};

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
            char truncated[20];
            if (len > 16) {
                strncpy(truncated, str, 16);
                truncated[16] = '\0';
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
    state->counter = vm->spark;
    state->running = true;
    state->step_mode = true;
    state->call_depth = 0;
}

void debugger_draw(struct debugger_state* state) {
    printf(ANSI_CLEAR ANSI_HOME);
    
    printf(" FLVM Debugger");
    for (int i = 14; i < TERM_WIDTH; i++) {
        printf(" ");
    }
    printf(ANSI_RESET "\n");
    
    draw_box(1, 2, CODE_PANEL_WIDTH, CODE_PANEL_HEIGHT, "Code");
    
    uint64_t display_start = state->counter;
    
    int lines_shown = 0;
    int max_lines = CODE_PANEL_HEIGHT - 2;
    uint64_t addr = display_start;
    
    for (int i = 0; i < max_lines && addr < state->vm->code_size; i++) {
        char disasm[64];
        disassemble_instruction(state, addr, disasm, sizeof(disasm));
        int len = instruction_length(state, addr);
        
        ANSI_GOTO(2, 3 + i);
        
        if (addr == state->counter) {
            printf(ANSI_BG_BLUE ANSI_FG_WHITE);
            printf(" %04lx: %-42s", addr, disasm);
            printf(ANSI_RESET);
        } else {
            printf(ANSI_FG_YELLOW " %04lx: " ANSI_RESET, addr);
            printf("%-42s", disasm);
        }
        
        addr += len;
        lines_shown++;
    }
    
    // Stack panel
    draw_box(CODE_PANEL_WIDTH + 1, 2, STACK_PANEL_WIDTH, STACK_PANEL_HEIGHT, "Stack");
    
    int stack_lines = STACK_PANEL_HEIGHT - 2;
    int stack_start = state->vm->stack_ptr > stack_lines ? state->vm->stack_ptr - stack_lines : 0;
    
    for (int i = 0; i < stack_lines; i++) {
        ANSI_GOTO(CODE_PANEL_WIDTH + 2, 3 + i);
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
    draw_box(1, CODE_PANEL_HEIGHT + 2, VARS_PANEL_WIDTH + 1, VARS_PANEL_HEIGHT, "Local Variables");
    
    int var_line = 0;
    int var_col = 0;
    int max_var_lines = VARS_PANEL_HEIGHT - 2;
    
    for (int i = 0; i < 256 && var_line < max_var_lines; i++) {
        if (state->variable_types[i] != 0 || state->variables[i] != 0) {
            ANSI_GOTO(2 + var_col * 24, CODE_PANEL_HEIGHT + 3 + var_line);
            printf(ANSI_FG_MAGENTA "%d" ANSI_RESET "=", i);
            printf("%ld", state->variables[i]);
            
            var_col++;
            if (var_col >= 2) {
                var_col = 0;
                var_line++;
            }
        }
    }
    
    // Global variables panel
    draw_box(CODE_PANEL_WIDTH + 1, CODE_PANEL_HEIGHT + 2, STACK_PANEL_WIDTH, VARS_PANEL_HEIGHT, "Globals");
    
    var_line = 0;
    for (int i = 0; i < state->vm->global_variable_size && var_line < VARS_PANEL_HEIGHT - 2; i++) {
        ANSI_GOTO(CODE_PANEL_WIDTH + 2, CODE_PANEL_HEIGHT + 3 + var_line);
        printf(ANSI_FG_CYAN "%d" ANSI_RESET "=%ld", i, state->vm->global_variables[i]);
        var_line++;
    }
    
    // Status bar
    ANSI_GOTO(1, TERM_HEIGHT);
    printf("Programm counter:%04lx  Stack pointer:%d  Call depth:%d ", state->counter, state->vm->stack_ptr, state->call_depth);

    printf(ANSI_RESET);
    
    fflush(stdout);
}

int64_t dbg_stack_pop(struct debugger_state* state) {
    return state->vm->stack[--state->vm->stack_ptr];
}

void dbg_stack_push(struct debugger_state* state, int64_t value) {
    state->vm->stack[state->vm->stack_ptr++] = value;
}


void resizeGlobalsIfNecessary(struct vm_instance* vm, int idx);
int datatypeToSize(int dt);
int64_t* selectVariable(uint64_t idx, int64_t* local, int64_t* global);
uint8_t getVariableType(uint64_t idx, uint8_t* local, uint8_t* global);
bool getVariableArray(uint64_t idx, uint8_t* local, uint8_t* global);

void debugger_step(struct debugger_state* state) {
    struct vm_instance* vm = state->vm;
    uint8_t instruction = read_u8(vm->code, state->counter++);
    
    switch (instruction) {
        case GLOBAL_RESERVE:
        case VARIABLE: {
            uint64_t idx = read_u64(vm->code, state->counter);
            state->counter += 8;
            uint8_t datatype = read_u8(vm->code, state->counter++);
            uint8_t array = read_u8(vm->code, state->counter++);
            if (!array) {
                datatype |= (1 << 7);
            }
            
            if (instruction == GLOBAL_RESERVE) {
                idx -= 256;
                resizeGlobalsIfNecessary(vm, idx);
                vm->global_variables[idx] = 0;
                vm->global_variable_types[idx] = datatype;
            } else {
                state->variables[idx] = 0;
                state->variable_types[idx] = datatype;
            }
            break;
        }
        
        case ASSIGN: {
            uint64_t idx = read_u64(vm->code, state->counter);
            state->counter += 8;
            *selectVariable(idx, state->variables, vm->global_variables) = dbg_stack_pop(state);
            break;
        }
        
        case ASSIGN_INDEXED: {
            uint64_t idx = read_u64(vm->code, state->counter);
            state->counter += 8;
            int64_t b = dbg_stack_pop(state);
            int64_t a = dbg_stack_pop(state);
            int sz = datatypeToSize(getVariableType(idx, state->variable_types, vm->global_variable_types));
            switch (sz) {
                case 1:
                    write_i8(*selectVariable(idx, state->variables, vm->global_variables), a, b);
                    break;
                case 2:
                    write_i16(*selectVariable(idx, state->variables, vm->global_variables), a * 2, b);
                    break;
                case 4:
                    write_i32(*selectVariable(idx, state->variables, vm->global_variables), a * 4, b);
                    break;
                case 8:
                    write_i64(*selectVariable(idx, state->variables, vm->global_variables), a * 8, b);
                    break;
            }
            break;
        }
        
        case LOAD: {
            uint64_t idx = read_u64(vm->code, state->counter);
            state->counter += 8;
            dbg_stack_push(state, *selectVariable(idx, state->variables, vm->global_variables));
            break;
        }
        
        case LOAD_INDEXED: {
            uint64_t idx = read_u64(vm->code, state->counter);
            state->counter += 8;
            if (getVariableArray(idx, state->variable_types, vm->global_variable_types)) {
                int sz = datatypeToSize(getVariableType(idx, state->variable_types, vm->global_variable_types));
                switch (sz) {
                    case 1:
                        dbg_stack_push(state, (uint8_t)read_i8(*selectVariable(idx, state->variables, vm->global_variables), dbg_stack_pop(state)));
                        break;
                    case 2:
                        dbg_stack_push(state, (uint16_t)read_i16(*selectVariable(idx, state->variables, vm->global_variables), dbg_stack_pop(state) * 2));
                        break;
                    case 4:
                        dbg_stack_push(state, (uint32_t)read_i32(*selectVariable(idx, state->variables, vm->global_variables), dbg_stack_pop(state) * 4));
                        break;
                    case 8:
                        dbg_stack_push(state, read_i64(*selectVariable(idx, state->variables, vm->global_variables), dbg_stack_pop(state) * 8));
                        break;
                }
            } else {
                dbg_stack_push(state, (*selectVariable(idx, state->variables, vm->global_variables) & (1 << dbg_stack_pop(state))) ? 1 : 0);
            }
            break;
        }
        
        case STRING: {
            uint64_t len = read_u64(vm->code, state->counter);
            state->counter += 8;
            dbg_stack_push(state, (int64_t)vm->code + state->counter);
            state->counter += len + 1;
            break;
        }
        
        case NUMBER: {
            int64_t num = read_i64(vm->code, state->counter);
            state->counter += 8;
            dbg_stack_push(state, num);
            break;
        }
        
        case GOTO: {
            state->counter = read_u64(vm->code, state->counter);
            break;
        }
        
        case GOTO_TRUE:
        case GOTO_FALSE: {
            uint64_t nextCounter = read_u64(vm->code, state->counter);
            state->counter += 8;
            
            if (instruction == GOTO_TRUE) {
                if (dbg_stack_pop(state)) {
                    state->counter = nextCounter;
                }
            } else {
                if (!dbg_stack_pop(state)) {
                    state->counter = nextCounter;
                }
            }
            break;
        }
        
        case INVOKE: {
            uint64_t loc = read_u64(vm->code, state->counter);
            state->counter += 8;
            
            if (state->call_depth < MAX_CALL_DEPTH) {
                struct call_frame* frame = &state->call_stack[state->call_depth];
                frame->return_address = state->counter;
                memcpy(frame->variables, state->variables, sizeof(state->variables));
                memcpy(frame->variable_types, state->variable_types, sizeof(state->variable_types));
                frame->noreturn = state->noreturn;
                
                memset(state->variables, 0, sizeof(state->variables));
                memset(state->variable_types, 0, sizeof(state->variable_types));
                state->noreturn = false;
                
                state->call_depth++;
                state->counter = loc;
            }
            break;
        }
        
        case INVOKE_NATIVE: {
            uint64_t nativeID = read_u64(vm->code, state->counter);
            state->counter += 8;
            
            extern NativeFunction nativeFunctions[];
            if (nativeID >= 11) {
                for (int i = 0; i < num_natives; i++) {
                    if (natives[i].id == nativeID) {
                        natives[i].function(vm);
                        break;
                    }
                }
            } else {
                nativeFunctions[nativeID](vm);
            }
            break;
        }
        
        case RETURN: {
            if (state->noreturn) {
                state->counter = read_u64(vm->code, 16);
                state->noreturn = false;
            } else if (state->call_depth > 0) {
                state->call_depth--;
                struct call_frame* frame = &state->call_stack[state->call_depth];
                state->counter = frame->return_address;
                memcpy(state->variables, frame->variables, sizeof(state->variables));
                memcpy(state->variable_types, frame->variable_types, sizeof(state->variable_types));
                state->noreturn = frame->noreturn;
            } else {
                state->running = false;
            }
            break;
        }
        
        case INCREASE:
        case DECREASE: {
            uint64_t idx = read_u64(vm->code, state->counter);
            state->counter += 8;
            
            if (instruction == INCREASE) {
                *selectVariable(idx, state->variables, vm->global_variables) += 1;
            } else {
                *selectVariable(idx, state->variables, vm->global_variables) -= 1;
            }
            break;
        }
        
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
        case SHIFT_LEFT:
        case SHIFT_RIGHT:
        case OR:
        case AND:
        case XOR: {
            int64_t b = dbg_stack_pop(state);
            int64_t a = dbg_stack_pop(state);
            int64_t result = 0;
            
            switch (instruction) {
                case ADD:
                    result = a + b;
                    break;
                case SUB:
                    result = a - b;
                    break;
                case MUL:
                    result = a * b;
                    break;
                case DIV:
                    result = a / b;
                    break;
                case MOD:
                    result = a % b;
                    break;
                case LESS:
                    result = a < b;
                    break;
                case LESS_EQUALS:
                    result = a <= b;
                    break;
                case MORE:
                    result = a > b;
                    break;
                case MORE_EQUALS:
                    result = a >= b;
                    break;
                case EQUALS:
                    result = a == b;
                    break;
                case NOT_EQUALS:
                    result = a != b;
                    break;
                case SHIFT_LEFT:
                    result = a << b;
                    break;
                case SHIFT_RIGHT:
                    result = a >> b;
                    break;
                case OR:
                    result = a | b;
                    break;
                case AND:
                    result = a & b;
                    break;
                case XOR:
                    result = a ^ b;
                    break;
            }
            dbg_stack_push(state, result);
            break;
        }
        
        case INVERT: {
            dbg_stack_push(state, !dbg_stack_pop(state));
            break;
        }
        
        case NOT: {
            dbg_stack_push(state, ~dbg_stack_pop(state));
            break;
        }
        
        case NORETURN: {
            state->noreturn = true;
            break;
        }
        
        case DELETE: {
            dbg_stack_pop(state);
            break;
        }
        
        case CHANGE_SIGN: {
            dbg_stack_push(state, -dbg_stack_pop(state));
            break;
        }
        
        default:
            state->running = false;
            break;
    }
}

void step(struct debugger_state* state) {
    if (state->running) {
        debugger_step(state);
    } 
}

bool debugger_handle_input(struct debugger_state* state) {
    char c = getchar();
    
    switch (c) {
        case '\n':
            step(state);
            break;
    }
    
    return true;
}

void debugger_run(struct debugger_state* state) {
    while (state->running) {
        debugger_draw(state);
        
        if (!debugger_handle_input(state)) {
            break;
        }
    }
    
    printf(ANSI_CLEAR ANSI_HOME);
    printf("Debugger terminated.\n");
}
