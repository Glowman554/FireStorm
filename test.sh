set -ex 

deno run -A src/index.ts tests/if.fl -o tests/if.elf
# nasm test.asm -felf64 -o test.o -g
# gcc test.o -o test.elf --static -g
