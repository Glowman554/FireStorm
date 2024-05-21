package utils

func IndexOf[T comparable](array []T, target T) int {
	for i := range array {
		if array[i] == target {
			return i
		}
	}
	return -1
}