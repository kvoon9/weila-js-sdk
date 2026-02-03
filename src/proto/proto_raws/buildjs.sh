#!/bin/bash
echo 'generating js.......'
pbjs -t static-module -w es6 --es6 --o weilapb.js *.proto --no-beautify --no-comments --force-long
echo 'generating d.ts.....'
pbjs -t static-module -w es6 --es6 --o weilapb_for_ts.js *.proto --force-long
pbts -o weilapb.d.ts weilapb_for_ts.js
rm -f weilapb_for_ts.js
echo 'copying weilapb.js weilapb.d.ts'
cp weilapb.js ../weilapb.js
cp weilapb.d.ts ../weilapb.d.ts
echo 'generating successfully'
