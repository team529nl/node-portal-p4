# portal-p4

EDSN Portal P4 client

You should consider using the Go version.

### Creating types
- Generate example xml with IntelliJ
- Generate json from xml: `for f in $(ls *.xml); do cat $f | npx xml2json > $(basename $f .xml).json; done`
- Cleanup json: remove urn field (or remove attribute from example xml)
- Generate ts from json: `for f in $(ls *.json); do npx maketypes -i $(basename $f .xsd.json).ts $f dummy; done`
- Cleanup ts: remove dummy
- Set optional fields in ts.
- Combine together in a file, filter duplicates, and fix name clashes.
