const fs = require("fs");
const path = require("path");

const TARGETS = ["chrome", "firefox"];
const COPY_DIRS = ["js", "service_worker", "html", "assets"];
const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function build(target) {
  const out = path.join(DIST, target);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  // Copy shared directories
  for (const dir of COPY_DIRS) {
    copyDir(path.join(ROOT, dir), path.join(out, dir));
  }

  // Copy the correct manifest
  fs.copyFileSync(
    path.join(ROOT, `manifest.${target}.json`),
    path.join(out, "manifest.json")
  );

  console.log(`Built: dist/${target}/`);
}

// Parse arguments
const arg = process.argv[2] || "all";
const targets = arg === "all" ? TARGETS : [arg];

if (!targets.every((t) => TARGETS.includes(t))) {
  console.error(`Usage: node build.js [chrome|firefox|all]`);
  process.exit(1);
}

targets.forEach(build);
