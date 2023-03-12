set -ex 

deno run -A src/index.ts tests/empty.fl -o tests/empty.elf
# nasm test.asm -felf64 -o test.o -g
# gcc test.o -o test.elf --static -g
