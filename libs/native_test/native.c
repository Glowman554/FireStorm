#include "../../src/flvm/vm.h"
#include <stdio.h>

void native_test(struct vm_instance* vm) {
    printf("Hello VM!\n");
    stack_push(vm, 139084);
}

void init() {
    vm_native_register(134987, native_test);
}