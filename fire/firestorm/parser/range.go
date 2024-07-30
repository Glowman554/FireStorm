package parser

import "fmt"

type RangeMode int

const (
	UP = iota
	DOWN
)

func GetRangeMode(t string) (DataType, error) {
	switch t {
	case "up":
		return UP, nil
	case "down":
		return DOWN, nil
	default:
		return 0, fmt.Errorf("Invalid mode " + t)
	}
}
