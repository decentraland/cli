#!/usr/bin/env node

'use strict';

var cli = require(".");
console.log('\n  You\'re now in development mode.');
cli.parse(process.argv);
