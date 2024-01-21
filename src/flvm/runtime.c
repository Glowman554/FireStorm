#include "vm.h"
#include <stdio.h>

void nativetest(struct vm_instance* instance) {
    printf("Hello world!");
    stack_push(instance, 1234);
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        printf("Usage: %s <flbb> ...\n", argv[0]);
        return -1;
    }

    struct vm_instance* vm = vm_load(argv[1]);
    
    stack_push(vm, argc - 1);
    stack_push(vm, (int64_t)&argv[1]);
    invoke(vm, vm->spark);

    vm_destroy(vm);
}