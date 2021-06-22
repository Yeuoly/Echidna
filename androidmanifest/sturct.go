package androidmanifest

type StringChunk struct {
	Size             uint32
	StringCount      uint32
	StyleCount       uint32
	StringPoolOffset uint32
	StylePoolOffset  uint32
	Strings          []string
	Style            []string
}

type Mainifest struct {
	Size        uint32
	MagicNumber uint32
	String      StringChunk
}
