package content

import _ "embed"

//go:embed catalog.json
var Catalog []byte

//go:embed cases.json
var Cases []byte
