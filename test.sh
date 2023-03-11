set -ex 

deno run -A src/index.ts tests/bit_index.fl -o tests/bit_index.elf
# nasm test.asm -felf64 -o test.o -g
# gcc test.o -o test.elf --static -g
