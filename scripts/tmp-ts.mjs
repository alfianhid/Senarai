const fs=require('fs');
const f='submission/test-results.md';
let s=fs.readFileSync(f,'utf8');
const old=s.match(/\*\*Run:\*\* [^\n]+/);
if(old){
  s=s.split(old[0]).join('**Run:** 29 October 2026, 21:12 WIB');
  fs.writeFileSync(f,s);
  console.log('updated');
} else { console.log('no match'); }
