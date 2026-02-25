'use strict';

let gentlyCopy = require('gently-copy');
console.log('开始拷贝数据');
let fileToCopy = ['dist/assets'];

let userPath = process.env.INIT_CWD + '/public';

gentlyCopy(fileToCopy, userPath, { overwrite: true });
