#pragma once

#include "../flvm/vm.h"
#include <stdbool.h>
#include <stddef.h>

#define ANSI_CLEAR      "\033[2J"
#define ANSI_HOME       "\033[H"
#define ANSI_RESET      "\033[0m"

#define ANSI_FG_BLACK   "\033[30m"
#define ANSI_FG_RED     "\033[31m"
#define ANSI_FG_GREEN   "\033[32m"
#define ANSI_FG_YELLOW  "\033[33m"
#define ANSI_FG_BLUE    "\033[34m"
#define ANSI_FG_MAGENTA "\033[35m"
#define ANSI_FG_CYAN    "\033[36m"
#define ANSI_FG_WHITE   "\033[37m"
#define ANSI_FG_GRAY    "\033[90m"

#define ANSI_BG_BLACK   "\033[40m"
#define ANSI_BG_RED     "\033[41m"
#define ANSI_BG_GREEN   "\033[42m"
#define ANSI_BG_YELLOW  "\033[43m"
#define ANSI_BG_BLUE    "\033[44m"
#define ANSI_BG_MAGENTA "\033[45m"
#define ANSI_BG_CYAN    "\033[46m"
#define ANSI_BG_WHITE   "\033[47m"

#define ANSI_GOTO(x, y) printf("\033[%d;%dH", (y), (x))
#define ANSI_HIDE_CURSOR "\033[?25l"
#define ANSI_SHOW_CURSOR "\033[?25h"

// #define TERM_WIDTH  80
// #define TERM_HEIGHT 25

// #define CODE_PANEL_WIDTH    50
// #define CODE_PANEL_HEIGHT   14
// #define STACK_PANEL_WIDTH   29
// #define STACK_PANEL_HEIGHT  14
// #define VARS_PANEL_WIDTH    50
// #define VARS_PANEL_HEIGHT   9
// #define STATUS_HEIGHT       1

struct debugger_state {
    struct vm_instance* vm;

    int width;
    int height;

    int code_panel_width;
    int code_panel_height;
    int stack_panel_width;
    int stack_panel_height;
    int vars_panel_width;
    int vars_panel_height;
};

struct instruction_info {
    uint64_t address;
    uint8_t opcode;
    int length;
    char disasm[64];
};

void debugger_init(struct debugger_state* state, struct vm_instance* vm);
void debugger_draw(struct debugger_state* state);
void debugger_step(struct debugger_state* state);
bool debugger_handle_input(struct debugger_state* state);
void debugger_run(struct debugger_state* state, uint64_t location);

const char* instruction_name(uint8_t opcode);
int instruction_length(struct debugger_state* state, uint64_t addr);
void disassemble_instruction(struct debugger_state* state, uint64_t addr, char* buf, size_t buf_size);
