package authentication

import "errors"

func isValidPassword(password string) error {
	if len(password) < 8 {
		return errors.New("password needs to be at least 8 characters long")
	}

	hasNumber := false
	hasUpperCase := false
	hasLowerCase := false

	for _, c := range password {
		if (c >= '0' && c <= '9') && !hasNumber {
			hasNumber = true
		} else if (c >= 'A' && c <= 'Z') && !hasUpperCase {
			hasUpperCase = true
		} else if (c >= 'a' && c <= 'z') && !hasLowerCase {
			hasLowerCase = true
		}
	}

	if !hasNumber || !hasUpperCase || !hasLowerCase {
		return errors.New("password needs to at least contain 1 upper case character, 1 lower case character and 1 number")
	}

	return nil
}
