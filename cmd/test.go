package main

import (
	"fmt"

	"github.com/Yeuoly/Echidna/androidmanifest"
)

func main() {
	file := androidmanifest.Mainifest{}
	file.Init("AndroidManifest.xml")
	fmt.Println(file.String.StringCount)
}
