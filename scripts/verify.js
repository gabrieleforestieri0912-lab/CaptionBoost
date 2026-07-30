#!/usr/bin/env node

/**
 * Script di verifica pre-development per CaptionBoost
 * Controlla che tutte le dipendenze siano installate e configurate correttamente
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function log(symbol, message, type = 'info') {
  const colors = {
    pass: '\x1b[32m✅\x1b[0m',
    fail: '\x1b[31m❌\x1b[0m',
    warn: '\x1b[33m⚠️ \x1b[0m',
    info: '\x1b[36mℹ️ \x1b[0m'
  };

  console.log(`${colors[type]} ${message}`);
}

console.log('\n🔍 Verifica pre-development CaptionBoost\n');

// 1. Controlla Node.js
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  log('info', `Node.js: ${nodeVersion}`, 'pass');
  checks.passed++;
} catch (error) {
  log('info', 'Node.js non trovato', 'fail');
  checks.failed++;
}

// 2. Controlla npm
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  log('info', `npm: v${npmVersion}`, 'pass');
  checks.passed++;
} catch (error) {
  log('info', 'npm non trovato', 'fail');
  checks.failed++;
}

// 3. Controlla dipendenze installate
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    log('info', 'node_modules installato', 'pass');
    checks.passed++;
  } else {
    log('info', 'node_modules non trovato (esegui: npm install)', 'warn');
    checks.warnings++;
  }
} else {
  log('info', 'package.json non trovato', 'fail');
  checks.failed++;
}

// 4. Controlla struttura cartelle
const requiredDirs = [
  'src/app',
  'public/extension',
  'public/extension/icons'
];

requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    log('info', `Cartella: ${dir}`, 'pass');
    checks.passed++;
  } else {
    log('info', `Cartella mancante: ${dir}`, 'warn');
    checks.warnings++;
  }
});

// 5. Controlla file critici
const requiredFiles = [
  'src/app/page.tsx',
  'public/extension/manifest.json',
  'public/extension/popup.html',
  'public/extension/content-script.js',
  'public/extension/background.js'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    log('info', `File: ${file}`, 'pass');
    checks.passed++;
  } else {
    log('info', `File mancante: ${file}`, 'fail');
    checks.failed++;
  }
});

// 6. Controlla Ollama
try {
  execSync('ollama --version', { encoding: 'utf8', stdio: 'pipe' });
  log('info', 'Ollama installato', 'pass');
  checks.passed++;
} catch (error) {
  log('info', 'Ollama non trovato (scarica da https://ollama.ai)', 'warn');
  checks.warnings++;
}

// 7. Controlla .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  log('info', '.env.local trovato', 'pass');
  checks.passed++;
} else {
  log('info', '.env.local non trovato (copia da .env.example)', 'warn');
  checks.warnings++;
}

// Riepilogo
console.log('\n' + '='.repeat(50));
console.log(`\nRiepilogo: ${checks.passed} ✅ | ${checks.warnings} ⚠️  | ${checks.failed} ❌\n`);

if (checks.failed === 0) {
  if (checks.warnings === 0) {
    console.log('🎉 Tutto è pronto! Esegui: npm run dev\n');
    process.exit(0);
  } else {
    console.log('⚠️  Alcuni componenti opzionali non sono configurati\n');
    console.log('Azioni consigliate:');
    if (!fs.existsSync(envPath)) {
      console.log('1. Copia .env.local da .env.example');
    }
    if (checks.warnings > 0) {
      console.log('2. Installa Ollama da https://ollama.ai');
    }
    console.log('\n');
    process.exit(0);
  }
} else {
  console.log('❌ Alcuni file critici sono mancanti\n');
  process.exit(1);
}
