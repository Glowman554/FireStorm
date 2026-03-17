#include "../flvm/vm.h"
#include "debugger.h"

#include <stdio.h>

#ifndef NO_TIOCGWINSZ
#include <sys/ioctl.h>
#include <unistd.h>
void read_tsize(int* width, int* height) {
    struct winsize w;
    ioctl(STDOUT_FILENO, TIOCGWINSZ, &w);
    
    *width = w.ws_col;
    *height = w.ws_row;
}
#else
void read_tsize(int* width, int* height) {
    *width = 80;
    *height = 25;
}
#endif

int main(int argc, char* argv[]) {
    if (argc < 2) {
        printf("Usage: %s <flbb> ...\n", argv[0]);
        return -1;
    }

    int width;
    int height;
    read_tsize(&width, &height);

    struct vm_instance* vm = vm_load(argv[1]);
    
    stack_push(vm, argc - 1);
    stack_push(vm, (int64_t)&argv[1]);
    
    struct debugger_state state;
    debugger_init(&state, vm);
    state.width = width;
    state.height = height;
    state.code_panel_width = (float)width * 0.60;
    state.code_panel_height = (float)height * 0.60;
    state.stack_panel_width = width - state.code_panel_width;
    state.stack_panel_height = state.code_panel_height;
    state.vars_panel_width = state.code_panel_width;
    state.vars_panel_height = height - state.code_panel_height - 2;

#if 0
    debugger_run(&state, vm->globals);
#else
    invoke(vm, vm->globals);
#endif
    stack_pop(vm);

    debugger_run(&state, vm->spark);
    
    vm_destroy(vm);
    
    return 0;
}
