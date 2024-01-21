import { functionGen, addDatatype, finish } from "../../src/tools/bindgen.ts";



addDatatype("void*", "int");
addDatatype("const void*", "int");
addDatatype("unsigned int*", "int[]");
addDatatype("unsigned int", "int");
addDatatype("int", "int");


functionGen(35269, "void tinf_init();");
functionGen(35270, "int tinf_uncompress(void* dest, unsigned int* destLen, const void* source, unsigned int sourceLen);");
functionGen(35271, "int tinf_gzip_uncompress(void* dest, unsigned int* destLen, const void* source, unsigned int sourceLen);");
functionGen(35272, "int tinf_zlib_uncompress(void* dest, unsigned int* destLen, const void* source, unsigned int sourceLen);");

const [ fl, c ] = finish(`#include "../../../src/flvm/vm.h"\n#include "tinf.h"\n`);

Deno.writeTextFileSync("tinf.fl", fl);
Deno.writeTextFileSync("c/native.c", c);
