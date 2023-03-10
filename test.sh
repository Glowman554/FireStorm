set -ex 

deno run -A src/index.ts test.fl -o test.elf
# nasm test.asm -felf64 -o test.o -g
# gcc test.o -o test.elf --static -g
