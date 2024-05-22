package firestorm

import (
	"fmt"
	"runtime"
)

func DetectTarget() string {
	switch runtime.GOOS {
	case "windows":
		switch runtime.GOARCH {
		case "amd64":
			return "x86_64-pc-win32-msvc"
		}
	case "linux":
		switch runtime.GOARCH {
		case "amd64":
			return "x86_64-pc-linux-gnu"
		case "arm64":
			return "aarch64-unknown-linux-gnu"
		case "riscv64":
			return "riscv64-unknown-linux-gnu"
		}
	}

	fmt.Println("[WARNING] no target set. Using default target. To overwrite this use TARGET or the project file.")

	return "x86_64-pc-linux-gnu"
}

func DetectExtension() string {
	switch runtime.GOOS {
	case "windows":
		return "exe"
	case "linux":
		return "elf"
	}
	return "elf"
}
