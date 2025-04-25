#!/usr/bin/env bun
import { build, type BuildConfig } from "bun";
import plugin from "bun-plugin-tailwind";
import { existsSync } from "fs";
import { rm } from "fs/promises";
import path from "path";

// Print help text if requested
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
🏗️  Bun Build Script

Usage: bun run build.ts [options]

Common Options:
  --outdir <path>          Output directory (default: "dist")
  --minify                 Enable minification (or --minify.whitespace, --minify.syntax, etc)
  --source-map <type>      Sourcemap type: none|linked|inline|external
  --target <target>        Build target: browser|bun|node
  --format <format>        Output format: esm|cjs|iife
  --splitting              Enable code splitting
  --packages <type>        Package handling: bundle|external
  --public-path <path>     Public path for assets
  --env <mode>             Environment handling: inline|disable|prefix*
  --conditions <list>      Package.json export conditions (comma separated)
  --external <list>        External packages (comma separated)
  --banner <text>          Add banner text to output
  --footer <text>          Add footer text to output
  --define <obj>           Define global constants (e.g. --define.VERSION=1.0.0)
  --compile                Build a standalone executable (server only)
  --bytecode               Enable bytecode compilation for faster startup (only with --compile)
  --help, -h               Show this help message

Example:
  bun run build.ts --outdir=dist --minify --source-map=linked --external=react,react-dom
`);
  process.exit(0);
}

// Helper function to convert kebab-case to camelCase
const toCamelCase = (str: string): string => {
  return str.replace(/-([a-z])/g, g => g[1].toUpperCase());
};

// Helper function to parse a value into appropriate type
// eslint-disable-next-line
const parseValue = (value: string): any => {
  // Handle true/false strings
  if (value === "true") return true;
  if (value === "false") return false;

  // Handle numbers
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d*\.\d+$/.test(value)) return parseFloat(value);

  // Handle arrays (comma-separated)
  if (value.includes(",")) return value.split(",").map(v => v.trim());

  // Default to string
  return value;
};

// Magical argument parser that converts CLI args to BuildConfig
function parseArgs(): Partial<BuildConfig> & { compile?: boolean, bytecode?: boolean } {
  // eslint-disable-next-line
  const config: Record<string, any> = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;

    // Handle --no-* flags
    if (arg.startsWith("--no-")) {
      const key = toCamelCase(arg.slice(5));
      config[key] = false;
      continue;
    }

    // Handle --flag (boolean true)
    if (!arg.includes("=") && (i === args.length - 1 || args[i + 1].startsWith("--"))) {
      const key = toCamelCase(arg.slice(2));
      config[key] = true;
      continue;
    }

    // Handle --key=value or --key value
    let key: string;
    let value: string;

    if (arg.includes("=")) {
      [key, value] = arg.slice(2).split("=", 2);
    } else {
      key = arg.slice(2);
      value = args[++i];
    }

    // Convert kebab-case key to camelCase
    key = toCamelCase(key);

    // Handle nested properties (e.g. --minify.whitespace)
    if (key.includes(".")) {
      const [parentKey, childKey] = key.split(".");
      config[parentKey] = config[parentKey] || {};
      config[parentKey][childKey] = parseValue(value);
    } else {
      config[key] = parseValue(value);
    }
  }

  return config as Partial<BuildConfig> & { compile?: boolean, bytecode?: boolean };
}

// Helper function to format file sizes
const formatFileSize = (bytes: number): string => {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

console.log("\n🚀 Starting build process...\n");

// Parse CLI arguments with our magical parser
const cliConfig = parseArgs();
const outdir = cliConfig.outdir || path.join(process.cwd(), "dist");

if (existsSync(outdir)) {
  console.log(`🗑️ Cleaning previous build at ${outdir}`);
  await rm(outdir, { recursive: true, force: true });
}

const start = performance.now();

// Build client-side assets
console.log("📦 Building client-side assets...");

// Find HTML entrypoints
const htmlEntrypoints = [...new Bun.Glob("**.html").scanSync("src")]
  .map(a => path.resolve("src", a))
  .filter(dir => !dir.includes("node_modules"));
console.log(`📄 Found ${htmlEntrypoints.length} HTML ${htmlEntrypoints.length === 1 ? "file" : "files"} to process\n`);

// Build client-side assets
const clientResult = await build({
  entrypoints: htmlEntrypoints,
  outdir,
  plugins: [plugin],
  minify: cliConfig.minify ?? true,
  target: "browser",
  sourcemap: cliConfig.sourceMap || "linked",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  ...cliConfig,
});

// Copy service worker if it exists
if (existsSync("src/service-worker.js")) {
  console.log("📋 Copying service worker...");
  await Bun.write(
    path.join(outdir, "service-worker.js"), 
    await Bun.file("src/service-worker.js").text()
  );
}

// Build server-side code
console.log("🔧 Building server-side code...");

// Define server entrypoint (index.ts) and any additional server files to include
const serverEntrypoint = path.resolve("src/index.ts");

// Server-side build configuration
const serverConfig: BuildConfig & { compile?: boolean, bytecode?: boolean } = {
  entrypoints: [serverEntrypoint],
  minify: cliConfig.minify ?? true,
  target: "bun",
  sourcemap: cliConfig.sourceMap || "linked",
  // For standalone executables
  compile: cliConfig.compile,
  bytecode: cliConfig.bytecode,
  // Use outfile for executables, outdir otherwise
  ...(cliConfig.compile 
    ? { outfile: path.join(outdir, "server") } 
    : { outdir }
  ),
};

// Build server
const serverResult = await build(serverConfig);

// Print the results
const end = performance.now();

console.log("\n📊 Client-side build results:");
const clientOutputTable = clientResult.outputs.map(output => ({
  "File": path.relative(process.cwd(), output.path),
  "Type": output.kind,
  "Size": formatFileSize(output.size),
}));
console.table(clientOutputTable);

console.log("\n📊 Server-side build results:");
const serverOutputTable = serverResult.outputs.map(output => ({
  "File": path.relative(process.cwd(), output.path),
  "Type": output.kind,
  "Size": formatFileSize(output.size),
}));
console.table(serverOutputTable);

const buildTime = (end - start).toFixed(2);
console.log(`\n✅ Production build completed in ${buildTime}ms\n`);
console.log(`🚀 To run the production server: ${cliConfig.compile ? './dist/server' : 'bun ./dist/index.js'}\n`);
