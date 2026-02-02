# FireStorm

## Overview

FireStorm is a programming language with two compiler implementations:
- **fire** - Full-featured Go implementation with build system, package manager, and multiple targets
- **firec** - Lightweight C implementation focusing on core compilation to bytecode

## Getting started

### Prerequisites

- Clang / LLVM (for LLVM target in Go compiler)
- Go (1.22 or newer) (for Go compiler)
- GCC or Clang (for C compiler)

### Installation

#### Go Compiler (fire)

1. `git clone https://github.com/Glowman554/FireStorm`
2. `cd FireStorm/fire`
3. `go install`

#### C Compiler (firec)

1. `git clone https://github.com/Glowman554/FireStorm`
2. `cd FireStorm/firec`
3. `make`

The C compiler is a simplified implementation that:
- Only supports the `compile` command
- Ignores module loading (`$use` directives)
- Only supports bytecode target (no LLVM)

See [firec/README.md](firec/README.md) for more details on the C compiler.

### Creating a project (Go compiler only)

1. `mkdir <project name>`
2. `cd <project name>`
3. `fire init --name=<project name> --executable`

#### Hello world example


```fl
$use <stdlib@1.0.6>

$include <std.fl>

function spark(int argc, str[] argv) -> int {
    prints("Hello world!");
    return 0;
}
```
