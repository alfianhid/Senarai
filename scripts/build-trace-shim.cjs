// Build-environment workaround: Next's trace writer opens <distDir>/trace with
// fs.createWriteStream, which fails with EPERM inside the sandboxed agent shell.
// The trace file is diagnostic only and never affects build output, so stub it.
// Production builds on a normal machine do not need this file.
const fs = require('fs');
const { Writable } = require('stream');

const originalCreateWriteStream = fs.createWriteStream;

fs.createWriteStream = function createWriteStream(target) {
  const path = typeof target === 'string' ? target : String(target && target.path);
  if (/(^|[\\/])trace$/.test(path)) {
    return new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });
  }
  return originalCreateWriteStream.apply(this, arguments);
};
