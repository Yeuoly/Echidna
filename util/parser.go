package util

func BytesToUnit32(b []byte) uint32 {
	if len(b) != 4 {
		return 0
	}
	var num uint32 = 0
	if IsBigEnd() {
		for i := 0; i < 4; i++ {
			num = num*16 + uint32(b[i])
		}
	} else {
		for i := 3; i >= 0; i-- {
			num = num*16 + uint32(b[i])
		}
	}
	return num
}
