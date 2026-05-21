const fs = require('fs');
const sm = require('source-map');

async function run() {
  const rawMap = fs.readFileSync('./dist/assets/index-XRtiWgrr.js.map', 'utf8');
  const consumer = await new sm.SourceMapConsumer(rawMap);
  
  const cct = consumer.originalPositionFor({line: 4715, column: 287163});
  console.log('cct location:', cct);
  
  const I8 = consumer.originalPositionFor({line: 38, column: 17031});
  console.log('I8 location:', I8);
  
  const mq = consumer.originalPositionFor({line: 40, column: 44104});
  console.log('mq location:', mq);
  
  // also what is line 40 column 0?
  const errLoc = consumer.originalPositionFor({line: 40, column: 0});
  console.log('error location:', errLoc);
}
run();
