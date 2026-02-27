'use strict';

let gentlyCopy = require('gently-copy');
let fileToCopy = ['dist/assets'];

let userPath = process.env.INIT_CWD + '/public';

gentlyCopy(fileToCopy, userPath, { overwrite: true });
