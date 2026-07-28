import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(scriptDirectory, '..');
const checkedDirectories = ['api', 'server'];
const checkedExtensions = new Set(['.js', '.mjs']);

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && checkedExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
};

const files = (
  await Promise.all(checkedDirectories.map((directory) => collectFiles(path.join(frontendDirectory, directory))))
)
  .flat()
  .sort((a, b) => a.localeCompare(b));

let hasFailure = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: frontendDirectory,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    hasFailure = true;
    process.stderr.write(result.stderr || result.stdout);
  }
}

for (const file of files) {
  try {
    await import(pathToFileURL(file).href);
  } catch (error) {
    hasFailure = true;
    const relativePath = path.relative(frontendDirectory, file);
    console.error(`Failed to import ${relativePath}:`);
    console.error(error?.stack || error);
  }
}

if (hasFailure) {
  process.exitCode = 1;
} else {
  console.log(`Serverless startup check passed for ${files.length} files.`);
}
