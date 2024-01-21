#include "vm.h"

#include <stdio.h>
#include <dlfcn.h>
#include <dirent.h>
#include <string.h>
#include <stdlib.h>

void load_so(const char* path) {
	printf("Loading %s...\n", path);

	void* handle = dlopen(path, RTLD_NOW);
	if (handle == NULL) {
		printf("Failed to load %s\n", dlerror());
		return;
	}
	
	void* func = dlsym(handle, "init");
	if (func == NULL) {
		printf("Failed to load %s\n", dlerror());
		return;
	}
	
	void (*init_func)() = (void (*)()) func;
	init_func();
}

void load_native_extensions(const char* folder) {
    DIR* dir = opendir(folder);
	if (dir == NULL) {
		return;
	}
	
	struct dirent* entry;
	while ((entry = readdir(dir)) != NULL) {

		int size = strlen(folder) + strlen(entry->d_name) + 1;
        char* full_path = (char*) malloc(size);
		memset(full_path, 0, size);
		sprintf(full_path, "%s/%s", folder, entry->d_name);

		if (entry->d_type == DT_DIR) {
			if (strcmp(entry->d_name, ".." ) == 0 || strcmp(entry->d_name, "." ) == 0) {
				continue;
			}
            load_native_extensions(full_path);
		} else if (entry->d_type == DT_REG) {
            if (strstr(entry->d_name, ".so") != NULL) {
				load_so(full_path);
			}
        }
		free(full_path);
	}
	
	closedir(dir);
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        printf("Usage: %s <flbb> ...\n", argv[0]);
        return -1;
    }

    load_native_extensions("modules");

    struct vm_instance* vm = vm_load(argv[1]);
    
    stack_push(vm, argc - 1);
    stack_push(vm, (int64_t)&argv[1]);
    invoke(vm, vm->spark);

    vm_destroy(vm);
}