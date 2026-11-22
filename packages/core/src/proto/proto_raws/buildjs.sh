#!/bin/bash
set -e
echo 'generating js.......'
pnpm exec pbjs -t static-module -w es6 --es6 --o weilapb.js *.proto --no-beautify --no-comments --force-long
echo 'generating d.ts.....'
pnpm exec pbjs -t static-module -w es6 --es6 --o weilapb_for_ts.js *.proto --force-long
pnpm exec pbts -o weilapb.d.ts weilapb_for_ts.js
rm -f weilapb_for_ts.js
echo 'formatting generated files'
pnpm exec oxfmt weilapb.js
echo 'copying weilapb.js weilapb.d.ts'
cp weilapb.js ../weilapb.js
cp weilapb.d.ts ../weilapb.d.ts
rm -f weilapb.js weilapb.d.ts
echo 'generating successfully'
