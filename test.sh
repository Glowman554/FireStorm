set -ex 

gcc src/flvm/*.c -o flvm

deno run -A test_runner/index.ts
# deno run -A test_runner/index.interpret.ts
deno run -A test_runner/index.upload.ts
deno run -A test_runner/index.bytecode.ts
# deno run -A src/index.interpret.ts tests/loop.fl -a test -a test2
# nasm test.asm -felf64 -o test.o -g
# gcc test.o -o test.elf --static -g
