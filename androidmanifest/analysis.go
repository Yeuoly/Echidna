package androidmanifest

import (
	"io/ioutil"

	"github.com/Yeuoly/Echidna/util"
)

func (m *Mainifest) Init(filename string) error {
	file, err := ioutil.ReadFile(filename)

	if err != nil {
		return err
	}

	//解析MagicNumber与Size
	m.MagicNumber = util.BytesToUnit32(file[0:4])
	m.Size = util.BytesToUnit32(file[4:8])
	//解析String
	m.String.Size = util.BytesToUnit32(file[12:16])
	m.String.StringCount = util.BytesToUnit32(file[16:20])
	m.String.StyleCount = util.BytesToUnit32(file[20:24])
	m.String.StringPoolOffset = util.BytesToUnit32(file[28:32])
	m.String.StylePoolOffset = util.BytesToUnit32(file[32:36])
	return nil
}
