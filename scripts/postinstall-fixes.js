const fs = require('fs');
const path = require('path');

const ensureExpoModuleScriptsShim = () => {
  const shimPath = path.join('node_modules', 'expo-module-scripts', 'tsconfig.base');
  if (!fs.existsSync(shimPath)) {
    // Some installs may not include expo-module-scripts in node_modules, but
    // expo-speech-recognition still expects this tsconfig path to resolve.
    fs.mkdirSync(path.dirname(shimPath), { recursive: true });
    fs.writeFileSync(shimPath, '{\n  "extends": "./tsconfig.base.json"\n}\n');
  }
};

const patchExpoSpeechRecognitionTsconfig = () => {
  const tsconfigPath = path.join('node_modules', 'expo-speech-recognition', 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    return;
  }

  const raw = fs.readFileSync(tsconfigPath, 'utf8');
  const parsed = JSON.parse(raw);
  let changed = false;

  if (parsed.extends !== '../expo-module-scripts/tsconfig.base.json') {
    parsed.extends = '../expo-module-scripts/tsconfig.base.json';
    changed = true;
  }

  parsed.compilerOptions = parsed.compilerOptions || {};

  if (parsed.compilerOptions.rootDir !== './src') {
    parsed.compilerOptions.rootDir = './src';
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(tsconfigPath, `${JSON.stringify(parsed, null, 2)}\n`);
  }
};

ensureExpoModuleScriptsShim();
patchExpoSpeechRecognitionTsconfig();
