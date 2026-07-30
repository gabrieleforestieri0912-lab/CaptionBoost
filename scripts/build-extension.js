#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const extensionDir = path.join(rootDir, "public", "extension");
const distDir = path.join(rootDir, "dist", "extension");

const errors = [];
const warnings = [];

function logInfo(message) {
  console.log(`INFO  ${message}`);
}

function logPass(message) {
  console.log(`PASS  ${message}`);
}

function logWarn(message) {
  warnings.push(message);
  console.warn(`WARN  ${message}`);
}

function logError(message) {
  errors.push(message);
  console.error(`FAIL  ${message}`);
}

function ensureExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    logError(`${label} mancante: ${filePath}`);
    return false;
  }
  logPass(`${label} trovato`);
  return true;
}

function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    logError(`JSON non valido in ${filePath}: ${error.message}`);
    return null;
  }
}

function checkJavaScriptSyntax(filePath) {
  try {
    execFileSync(process.execPath, ["--check", filePath], {
      stdio: "pipe",
    });
    logPass(`Sintassi JS valida: ${path.relative(rootDir, filePath)}`);
  } catch (error) {
    const output = error.stderr?.toString("utf8") || error.message;
    logError(
      `Errore sintassi JS in ${path.relative(rootDir, filePath)}:\n${output}`
    );
  }
}

function copyDirRecursive(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const dstPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function cleanDir(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function main() {
  console.log("\nBuild estensione CaptionBoost\n");

  if (!ensureExists(extensionDir, "Cartella estensione")) {
    process.exit(1);
  }

  const manifestPath = path.join(extensionDir, "manifest.json");
  const popupPath = path.join(extensionDir, "popup.html");
  const backgroundPath = path.join(extensionDir, "background.js");
  const contentScriptPath = path.join(extensionDir, "content-script.js");
  const popupScriptPath = path.join(extensionDir, "popup.js");
  const authModulePath = path.join(extensionDir, "auth-module.js");

  ensureExists(manifestPath, "Manifest");
  ensureExists(popupPath, "Popup HTML");
  ensureExists(backgroundPath, "Background script");
  ensureExists(contentScriptPath, "Content script");
  ensureExists(popupScriptPath, "Popup script");
  ensureExists(authModulePath, "Auth module");

  const manifest = readJson(manifestPath);
  if (manifest) {
    if (manifest.manifest_version !== 3) {
      logError("manifest_version deve essere 3");
    } else {
      logPass("Manifest v3 confermato");
    }

    if (!manifest.name || !manifest.version) {
      logError("Manifest deve contenere name e version");
    } else {
      logPass("Name e version presenti");
    }

    const iconEntries = Object.entries(manifest.icons || {});
    if (iconEntries.length === 0) {
      logWarn("Nessuna icona definita in manifest.icons");
    }
    for (const [size, relativeIconPath] of iconEntries) {
      const iconAbs = path.join(extensionDir, relativeIconPath);
      if (!fs.existsSync(iconAbs)) {
        logError(`Icona ${size} mancante: ${relativeIconPath}`);
      } else {
        logPass(`Icona ${size} trovata: ${relativeIconPath}`);
      }
    }
  }

  [backgroundPath, contentScriptPath, popupScriptPath, authModulePath]
    .filter((filePath) => fs.existsSync(filePath))
    .forEach(checkJavaScriptSyntax);

  if (fs.existsSync(popupPath)) {
    const popupHtml = fs.readFileSync(popupPath, "utf8");
    if (!popupHtml.includes('src="popup.js"')) {
      logError("popup.html non include popup.js");
    } else {
      logPass("popup.html include popup.js");
    }
    if (!popupHtml.includes('src="auth-module.js"')) {
      logWarn("popup.html non include auth-module.js");
    } else {
      logPass("popup.html include auth-module.js");
    }
  }

  if (errors.length > 0) {
    console.error(
      `\nBuild interrotta: ${errors.length} errore/i, ${warnings.length} warning.\n`
    );
    process.exit(1);
  }

  logInfo("Pulizia output precedente");
  cleanDir(distDir);
  logInfo("Copia file estensione in dist/extension");
  copyDirRecursive(extensionDir, distDir);
  logPass("Build completata");
  console.log(`Output: ${path.relative(rootDir, distDir)}\n`);

  if (warnings.length > 0) {
    console.warn(`Completata con ${warnings.length} warning.\n`);
  }

  process.exit(0);
}

main();
