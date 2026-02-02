CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -O2
TARGET = firec
SOURCES = main.c lexer.c preprocessor.c parser.c bytecode.c
OBJECTS = $(SOURCES:.c=.o)

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJECTS)
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJECTS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJECTS) $(TARGET)

# Dependencies
main.o: main.c lexer.h parser.h preprocessor.h bytecode.h
lexer.o: lexer.c lexer.h
preprocessor.o: preprocessor.c preprocessor.h
parser.o: parser.c parser.h lexer.h
bytecode.o: bytecode.c bytecode.h parser.h
