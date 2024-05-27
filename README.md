# FireStorm

## Getting started

### Prerequisites

- Clang / LLVM
- Go (1.22 or newer)

### Instalation

1. `git clone https://github.com/Glowman554/FireStorm`
2. `cd FireStorm/fire`
3. `go install`

### Creating a project

1. `mkdir <project name>`
2. `cd <project name>`
3. `fire init --name=<project name> --executable`

#### Hello world example


```fl
$use <stdlib@1.0.4>

$include <std.fl>

function spark(int argc, str[] argv) -> int {
    prints("Hello world!");
    return 0;
}
```
