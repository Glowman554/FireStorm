# FireStorm C Compiler (firec)

A C implementation of the FireStorm compiler, focusing on the core compilation functionality.

## Features

- **Lexical Analysis**: Tokenizes FireStorm source code
- **Parsing**: Builds Abstract Syntax Tree (AST) from tokens
- **Preprocessing**: Handles `$include` and `$define` directives
- **Code Generation**: Outputs bytecode in `.flb` format

## Limitations

This C implementation is a simplified version that:
- **Only supports the `compile` command** - does not include build system, project management, or other commands
- **Ignores module loading** (`$use` directives) - only local file includes are supported
- **Only supports bytecode target** - LLVM target is not implemented
- **No FirePack integration** - no remote package/version management

## Building

```bash
cd firec
make
```

This will create the `firec` executable.

## Usage

```bash
./firec --input=<source.fl> --output=<output.flb> [--include=<path>]
```

### Arguments

- `--input=<file>` - Input FireStorm source file (`.fl`)
- `--output=<file>` - Output bytecode file (`.flb`)
- `--include=<path>` - Add directory to include path (can be used multiple times)

### Example

```bash
# Compile a simple program
./firec --input=hello.fl --output=hello.flb

# Compile with include paths
./firec --input=main.fl --output=main.flb --include=../stdlib
```

## Architecture

The compiler consists of several modules:

1. **lexer.c** - Lexical analyzer that converts source code into tokens
2. **parser.c** - Parser that builds an AST from tokens
3. **preprocessor.c** - Preprocessor that handles directives
4. **bytecode.c** - Code generator that produces bytecode
5. **main.c** - Command-line interface

## Supported Language Features

- Function definitions with parameters and return types
- Variable declarations and assignments
- Expressions with operators (+, -, *, /, %, ==, !=, <, <=, >, >=, etc.)
- Control flow (if/else, while, for, do-while, break, continue)
- Function calls
- Arrays
- Data types: int, str, void, chr, ptr, int32, int16

## Output Format

The compiler generates bytecode in text format with instructions like:

```
@begin global global
@end global
@begin function name
name:
    variable x int false
    load x
    number 42
    add
    return
@end function
```

This bytecode can be executed by the FireStorm VM (flvm).

## Development

The code is written in standard C99 and compiles with:
- gcc
- clang

Compile with warnings enabled:
```bash
gcc -Wall -Wextra -std=c99 -O2 -o firec *.c
```

## Compatibility

The C compiler produces bytecode compatible with the Go compiler's bytecode output and can be executed by the same VM.
