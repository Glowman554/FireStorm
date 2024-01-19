#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <stdbool.h>
#include <stdint.h>

#define read_i64(ptr, offset) *((int64_t*)((int64_t) ptr + offset))
#define write_i64(ptr, offset, value) *((int64_t*)((int64_t) ptr + offset)) = value

#define read_u64(ptr, offset) *((uint64_t*)((int64_t) ptr + offset))

#define read_u8(ptr, offset) *((uint8_t*)((int64_t) ptr + offset))

#define read_i8(ptr, offset) *((uint8_t*)((int64_t) ptr + offset))
#define write_i8(ptr, offset, value) *((uint8_t*)((int64_t) ptr + offset)) = value

void* code;

int64_t stack[256] = { 0 }; // TODO: make dynamic
int current_stack = 0;

void stack_push(int64_t value) {
    stack[current_stack++] = value;
}

int64_t stack_pop() {
    return stack[--current_stack];
}

enum Instructions {
    GLOBAL_RESERVE,

    ASSIGN,
    ASSIGN_INDEXED,
    LOAD,
    LOAD_INDEXED,
    
    NUMBER,
    STRING,
    
    GOTO,
    GOTO_TRUE,
    GOTO_FALSE,
    INVOKE,
    INVOKE_NATIVE,
    RETURN,
    
    VARIABLE,
    
    INCREASE,
    DECREASE,
    
    ADD,
    SUB,
    MUL,
    DIV,
    MOD,
    
    LESS,
    LESS_EQUALS,
    MORE,
    MORE_EQUALS,
    EQUALS,
    NOT_EQUALS,

    INVERT,
    
    SHIFT_LEFT,
    SHIFT_RIGHT,
    OR,
    AND,
    XOR,
    NOT,
    
    
    NORETURN,
    DELETE
};

enum Datatypes {
    INT,
    CHR,
    STR
};

typedef void (*NativeFunction)();
void invoke(uint64_t location);

void nativePrintc() {
    char c = stack_pop();
    putchar(c);
    stack_push(0);
}

void nativeAllocate() {
    stack_push((int64_t) malloc(stack_pop()));
}

void nativeDeallocate() {
    free((void*) stack_pop());
    stack_push(0);
}

void nativeDoExit() {
    exit(stack_pop());
}

void nativeFileOpen() {
    const char* mode = (const char*) stack_pop();
    const char* file = (const char*) stack_pop();
    stack_push((int64_t) fopen(file, mode));
}

void nativeFileWrite() {
    int64_t offset = stack_pop();
    int64_t size = stack_pop();
    const char* buffer = (const char*) stack_pop();
    FILE* f = (FILE*) stack_pop();

    fseek(f, offset, SEEK_SET);
    fwrite(buffer, size, 1, f);
    stack_push(0);
}

void nativeFileRead() {
    int64_t offset = stack_pop();
    int64_t size = stack_pop();
    char* buffer = (char*) stack_pop();
    FILE* f = (FILE*) stack_pop();

    fseek(f, offset, SEEK_SET);
    fread(buffer, size, 1, f);
    stack_push(0);
}

void nativeFileClose() {
    fclose((FILE*) stack_pop());
    stack_push(0);
}

void nativeFileSize() {
    FILE* f = (FILE*) stack_pop();
    fseek(f, 0, SEEK_END);
    stack_push(ftell(f));
}

void nativeMemoryWrite16() {
    int64_t value = stack_pop();
    int64_t ptr = stack_pop();
    *(uint16_t*) ptr = value;
    stack_push(0);
}

void nativeMemoryRead16() {
    stack_push(*(uint16_t*) stack_pop());
}

void nativeMemoryWrite32() {
    int64_t value = stack_pop();
    int64_t ptr = stack_pop();
    *(uint32_t*) ptr = value;
    stack_push(0);
}

void nativeMemoryRead32() {
    stack_push(*(uint32_t*) stack_pop());
}

void nativeCall0() {
    int64_t ptr = stack_pop();
    invoke(ptr);
}

void nativeCall1() {
    int64_t arg1 = stack_pop();
    int64_t ptr = stack_pop();
    stack_push(arg1);
    invoke(ptr);
}

void nativeCall2() {
    int64_t arg2 = stack_pop();
    int64_t arg1 = stack_pop();
    int64_t ptr = stack_pop();
    stack_push(arg1);
    stack_push(arg2);
    invoke(ptr);
}

void nativeCall3() {
    int64_t arg3 = stack_pop();
    int64_t arg2 = stack_pop();
    int64_t arg1 = stack_pop();
    int64_t ptr = stack_pop();
    stack_push(arg1);
    stack_push(arg2);
    stack_push(arg3);
    invoke(ptr);
}

void nativeCall4() {
    int64_t arg4 = stack_pop();
    int64_t arg3 = stack_pop();
    int64_t arg2 = stack_pop();
    int64_t arg1 = stack_pop();
    int64_t ptr = stack_pop();
    stack_push(arg1);
    stack_push(arg2);
    stack_push(arg3);
    stack_push(arg4);
    invoke(ptr);
}


NativeFunction nativeFunctions[] = {
    nativePrintc,
    nativeAllocate,
    nativeDeallocate,
    nativeDoExit,
    nativeFileOpen,
    nativeFileWrite,
    nativeFileRead,
    nativeFileClose,
    nativeFileSize,
    nativeMemoryWrite16,
    nativeMemoryRead16,
    nativeMemoryWrite32,
    nativeMemoryRead32,
    nativeCall0,
    nativeCall1,
    nativeCall2,
    nativeCall3,
    nativeCall4
};

int64_t* global_variables = NULL;
uint8_t* global_variable_types = NULL;
int global_variable_size = 0;

void resizeGlobalsIfNecessary(int idx) {
    idx++;
    if (idx > global_variable_size) {
        global_variables = realloc(global_variables, sizeof(int64_t) * idx);
        global_variable_types = realloc(global_variable_types, sizeof(uint8_t) * idx);
        global_variable_size = idx;
    }
}

int64_t* selectVariable(uint64_t idx, int64_t* local, int64_t* global) {
    if (idx >= 256) {
        return &global[idx - 256];
    } else {
        return &local[idx];
    }
}

uint8_t getVariableType(uint64_t idx, uint8_t* local, uint8_t* global) {
    if (idx >= 256) {
        return global[idx - 256] & ~(1 << 7);
    } else {
        return local[idx] & ~(1 << 7);
    }
}

bool getVariableArray(uint64_t idx, uint8_t* local, uint8_t* global) {
    if (idx >= 256) {
        return !(global[idx - 256] & (1 << 7));
    } else {
        return !(local[idx] & (1 << 7));
    }
}

void invoke(uint64_t location) {
    uint64_t counter = location;

    int64_t variables[256] = { 0 };
    uint8_t variable_types[256] = { 0 };

    bool noreturn = false;

    while (true) {
        uint8_t instruction = read_u8(code, counter++);

        switch (instruction) {
            case GLOBAL_RESERVE:
            case VARIABLE:
            {
                uint64_t idx = read_u64(code, counter);
                counter += 8;
                uint8_t datatype = read_u8(code, counter++);
                uint8_t array = read_u8(code, counter++);
                if (!array) {
                    datatype |= (1 << 7);
                }

                if (instruction == GLOBAL_RESERVE) {
                    idx -= 256;
                    resizeGlobalsIfNecessary(idx);
                    global_variables[idx] = 0;
                    global_variable_types[idx] = datatype;
                } else {
                    variables[idx] = 0;
                    variable_types[idx] = datatype;
                }
            }
            break;

            case ASSIGN:
            {
                uint64_t idx = read_u64(code, counter);
                counter += 8;
                *selectVariable(idx, variables, global_variables) = stack_pop();
            }
            break;
            case ASSIGN_INDEXED:
            {
                uint64_t idx = read_u64(code, counter);
                counter += 8;
                int64_t b = stack_pop();
                int64_t a = stack_pop();
                if (getVariableType(idx, variable_types, global_variable_types) == CHR) {
                    write_i8(*selectVariable(idx, variables, global_variables), a, b);
                } else {
                    write_i64(*selectVariable(idx, variables, global_variables), a * 8, b);
                }
            }
            break;
            case LOAD:
            {
                uint64_t idx = read_u64(code, counter);
                counter += 8;
                stack_push(*selectVariable(idx, variables, global_variables));
            }
            break;
            case LOAD_INDEXED:
            {
                uint64_t idx = read_u64(code, counter);
                counter += 8;
                if (getVariableArray(idx, variable_types, global_variable_types)) {
                    if (getVariableType(idx, variable_types, global_variable_types) == CHR) {
                        stack_push(read_i8(*selectVariable(idx, variables, global_variables), stack_pop()));
                    } else {
                        stack_push(read_i64(*selectVariable(idx, variables, global_variables), stack_pop() * 8));
                    }
                } else {
                    stack_push((*selectVariable(idx, variables, global_variables) & (1 << stack_pop())) ? 1 : 0); 
                }
            }
            break;
            
            case STRING:
            {
                uint64_t len = read_u64(code, counter);
                counter += 8;

                stack_push((int64_t) code + counter);

                counter += len + 1;
            }
            break;
            case NUMBER:
            {
                int64_t num = read_u64(code, counter);
                counter += 8;
                stack_push(num);
            }
            break;

            case GOTO:
            {
                counter = read_u64(code, counter);
            }
            break;
            case GOTO_TRUE:
            case GOTO_FALSE:
            {
                uint64_t nextCounter = read_u64(code, counter);
                counter += 8;

                if (instruction == GOTO_TRUE) {
                    if (stack_pop()) {
                        counter = nextCounter;
                    }
                } else {
                    if (!stack_pop()) {
                        counter = nextCounter;
                    }
                }
            }
            break;            
            case INVOKE:
            {
                uint64_t loc = read_u64(code, counter);
                counter += 8;

                invoke(loc);
            }
            break;
            case INVOKE_NATIVE:
            {
                uint64_t nativeID = read_u64(code, counter);
                counter += 8;

                if (nativeID >= sizeof(nativeFunctions) / sizeof(NativeFunction)) {
                    printf("Native with id %ld not found!\n", nativeID);
                    abort();
                }

                nativeFunctions[nativeID]();
            }
            break;
            case RETURN:
            {
                if (noreturn) {
                    invoke(read_u64(code, 16));
                }
                return;
            }
            break;

            case INCREASE:
            case DECREASE:
            {
                uint64_t idx = read_u64(code, counter);
                counter += 8;

                if (instruction == INCREASE) {
                    *selectVariable(idx, variables, global_variables) += 1;
                } else {
                    *selectVariable(idx, variables, global_variables) -= 1;
                }
            }
            break;

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
            case XOR:
            {
                int64_t b = stack_pop();
                int64_t a = stack_pop();
                switch (instruction) {
                    case ADD:
                        stack_push(a + b);
                        break;
                    case SUB:
                        stack_push(a - b);
                        break;
                    case MUL:
                        stack_push(a * b);
                        break;
                    case DIV:
                        stack_push(a / b);
                        break;
                    case MOD:
                        stack_push(a % b);
                        break;

                    case LESS:
                        stack_push(a < b);
                        break;
                    case LESS_EQUALS:
                        stack_push(a <= b);
                        break;
                    case MORE:
                        stack_push(a > b);
                        break;
                    case MORE_EQUALS:
                        stack_push(a >= b);
                        break;
                    case EQUALS:
                        stack_push(a == b);
                        break;
                    case NOT_EQUALS:
                        stack_push(a != b);
                        break;

                    case SHIFT_LEFT:
                        stack_push(a << b);
                        break;
                    case SHIFT_RIGHT:
                        stack_push(a >> b);
                        break;
                    case OR:
                        stack_push(a | b);
                        break;
                    case AND:
                        stack_push(a & b);
                        break;
                    case XOR:
                        stack_push(a ^ b);
                        break;
                }
            }
            break;

            
            case INVERT:
            {
                stack_push(!stack_pop());
            }
            break;

            
            case NOT:
            {
                stack_push(~stack_pop());
            }
            break;

            case NORETURN:
            {
                noreturn = true;
            }
            break;

            case DELETE:
            {
                stack_pop();
            }
            break;

            default:
                printf("Invalid instruction %d\n", instruction);
                abort();
        }
    }
}

int main(int argc, char* argv[]) {
    FILE* codeFile = fopen(argv[1], "rb");
    assert(codeFile);

    fseek(codeFile, 0, SEEK_END);
    int codeSize = ftell(codeFile);
    fseek(codeFile, 0, SEEK_SET);

    code = malloc(codeSize);
    fread(code, codeSize, 1, codeFile);
    fclose(codeFile);

    uint64_t entrypoint = read_i64(code, 0);
    uint64_t global = read_i64(code, 8);
    // printf("Entrypoint: %ld\n", entrypoint);
    
    invoke(global);

    stack_push(argc - 1);
    stack_push((int64_t) &argv[1]);
    invoke(entrypoint);
}