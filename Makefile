%.elf: %.fl
	@echo FLC $<
	@deno run -A src/index.ts $< -o $@

test:
	bash test.sh

all: $(patsubst %.fl,%.elf,$(wildcard tests/*.fl))

clean:
	rm tests/*.elf tests/*.o tests/*.asm tests/*.json tests/*.summary