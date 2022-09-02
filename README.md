# Qrial
Qrial serializes and deserializes QR codes to and from a JSON schema.

## Usage
Qrial can be installed as a global command or local package.

```sh
npm install -g github:sortiz4/qrial#1.1.0
```

```json
"qrial": "github:sortiz4/qrial#1.1.0"
```

`qrial` operates as a serializer or deserializer. As a serializer, the output
path should be where the JSON schema will be written and the list of files
should be QR codes. As a deserializer, the output path should be where the QR
codes will be saved and the list of files should be JSON schemas.

```sh
Usage: qrial [-s|-d] [-o PATH] [FILES]

Options:
  -d, --deserialize  Deserializes a JSON schema into (PNG) QR codes       [boolean] [default: false]
  -s, --serialize    Serializes (PNG) QR codes into a JSON schema         [boolean] [default: false]
  -o, --output       Where file(s) produced by this tool should be saved      [string] [default: ""]
  -h, --help         Show help                                                             [boolean]
  -v, --version      Show version number                                                   [boolean]
```
