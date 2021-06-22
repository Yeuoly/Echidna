package util

var big_end_flag uint16 = 0x1

func IsBigEnd() bool {
	return uint8(big_end_flag) == 0
}
