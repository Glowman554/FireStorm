import { structGen } from "../../src/tools/structgen.ts";
import { functionGen, addDatatype, finish } from "../../src/tools/bindgen.ts";

const struct = `
struct vm_instance {
	void* code;

	int64_t* stack;
	int stack_ptr;
	int max_stack;

	int64_t* global_variables;
	uint8_t* global_variable_types;
	int global_variable_size;

    int64_t spark;
};
`;


const struct_bind = await structGen(struct, "struct vm_instance", [
    "code",
    "stack",
    "stack_ptr",
    "max_stack",
    "global_variables",
    "global_variable_types",
    "global_variable_size",
    "spark"
]);

addDatatype("struct vm_instance*", "int");
addDatatype("vm_instance*", "int");
addDatatype("int64_t", "int");
addDatatype("uint64_t", "int");

functionGen(48327, "void stack_push(struct vm_instance* vm, int64_t value);");
functionGen(48328, "int64_t stack_pop(struct vm_instance* vm);");
functionGen(48329, "void invoke(struct vm_instance* vm, uint64_t location);");
functionGen(48330, "struct vm_instance* vm_load(const char* file);");
functionGen(48331, "void vm_destroy(struct vm_instance* vm);");


const [ fl, c ] = finish(`#include "../../src/flvm/vm.h"\n`);

Deno.writeTextFileSync("vm.fl", struct_bind + fl);
Deno.writeTextFileSync("native.c", c);
