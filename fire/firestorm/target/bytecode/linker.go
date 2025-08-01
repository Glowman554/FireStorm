package bytecode

import (
	"encoding/binary"
	"log/slog"
	"strconv"
	"strings"
)

type LinkLocation struct {
	name    string
	byteIdx int64
}

func Link(code string) []byte {
	symbols := []LinkLocation{}
	linkLocs := []LinkLocation{}
	buffer := []byte{}

	findSymbol := func(name string) LinkLocation {
		for _, s := range symbols {
			if s.name == name {
				return s
			}
		}

		panic("Symbol " + name + " not found!")
	}

	lines := strings.Split(code, "\n")
	var byteIdx int64 = 0
	for _, i := range lines {
		i = strings.TrimSpace(i)

		if i == "" {
			continue
		}

		if strings.Contains(i, ";") {
			i = strings.TrimSpace(i[:strings.Index(i, ";")])
		}

		if strings.HasPrefix(i, "[") {
			// ignore
		} else if strings.HasSuffix(i, ":") {
			symbols = append(symbols, LinkLocation{
				name:    i[0 : len(i)-1],
				byteIdx: byteIdx,
			})
		} else if strings.HasPrefix(i, "db ") {
			values := strings.Split(i[3:], ",")

			for _, val := range values {
				if strings.HasPrefix(val, "\"") && strings.HasSuffix(val, "\"") {
					str := []byte(val[1 : len(val)-1])

					buffer = append(buffer, str...)
					byteIdx += int64(len(str))
				} else {
					num, _ := strconv.Atoi(strings.TrimSpace(val))

					buffer = append(buffer, byte(num))
					byteIdx++
				}
			}
		} else if strings.HasPrefix(i, "dq ") {
			values := strings.Split(i[3:], ",")

			for _, val := range values {
				num, err := strconv.Atoi(strings.TrimSpace(val))

				numBuf := make([]byte, 8)
				if err != nil {
					linkLocs = append(linkLocs, LinkLocation{
						name:    val,
						byteIdx: byteIdx,
					})
				} else {
					binary.LittleEndian.PutUint64(numBuf, uint64(num))
				}

				buffer = append(buffer, numBuf...)
				byteIdx += int64(len(numBuf))
			}
		} else {
			panic("Invalid line " + i)
		}
	}

	for _, i := range symbols {
		slog.Debug("Symbol "+i.name, "byteIdx", i.byteIdx)
	}

	for _, i := range linkLocs {
		slog.Debug("Link location "+i.name, "byteIdx", i.byteIdx)
	}

	for _, loc := range linkLocs {
		symbol := findSymbol(loc.name)

		buf := make([]byte, 8)
		binary.LittleEndian.PutUint64(buf, uint64(symbol.byteIdx))

		for i := range len(buf) {
			buffer[loc.byteIdx+int64(i)] = buf[i]
		}
	}

	return buffer
}
