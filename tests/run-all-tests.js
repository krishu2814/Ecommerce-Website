const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n===============================================================');
console.log('  🧪 ECOMMERCE MICROSERVICES - COMPREHENSIVE TEST RUNNER');
console.log('===============================================================\n');

const testFiles = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.test.js'))
  .map(file => path.join(__dirname, file));

console.log(`Found ${testFiles.length} test suites:`);
testFiles.forEach(f => console.log(`  • ${path.basename(f)}`));
console.log('\nExecuting tests with Node.js test runner...\n');

const rootDir = path.resolve(__dirname, '..');
const servicesDir = path.join(rootDir, 'services');
const serviceNodeModules = fs.readdirSync(servicesDir)
  .map(service => path.join(servicesDir, service, 'node_modules'))
  .filter(p => fs.existsSync(p));

const existingNodePath = process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [];
const combinedNodePath = [...serviceNodeModules, ...existingNodePath].join(path.delimiter);

const runner = spawn('node', ['--test', ...testFiles], {
  stdio: 'inherit',
  cwd: rootDir,
  env: {
    ...process.env,
    NODE_PATH: combinedNodePath
  }
});

runner.on('close', (code) => {
  console.log('\n===============================================================');
  if (code === 0) {
    console.log('  ✅ ALL TESTS PASSED SUCCESSFULLY! No bugs detected.');
  } else {
    console.log(`  ❌ SOME TESTS FAILED (Exit code ${code})`);
  }
  console.log('===============================================================\n');
  process.exit(code);
});
