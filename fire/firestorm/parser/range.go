package parser

import (
	"fmt"
)

type RangeMode int

const (
	RANGE_UP RangeMode = iota
	RANGE_DOWN
)

func GetRangeMode(t string) (RangeMode, error) {
	switch t {
	case "up":
		return RANGE_UP, nil
	case "down":
		return RANGE_DOWN, nil
	default:
		return 0, fmt.Errorf("Invalid mode " + t)
	}
}
