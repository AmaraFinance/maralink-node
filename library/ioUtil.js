const fs = require('fs')
const { promisify } = require('util')

const fileExists = (s) => new Promise(r => fs.access(s, fs.F_OK, e => r(!e)))

// Recursive read dir
async function readDir(dir, allFiles = []) {
  const files = (await fs.readdir(dir)).map((file) => path.join(dir, file))
  allFiles.push(...files)
  await Promise.all(files.map(async (file) => (await fs.stat(file)).isDirectory() && readDir(file, allFiles)))
  return allFiles
}

module.exports = {
  // Check if file exists
  fileExists: fileExists,
  // Read file
  readFile: promisify(fs.readFile),
  // Read file sync
  readFileSync: fs.readFileSync,
  // Write file
  writeFile: promisify(fs.writeFile),
  // Copy file
  copyFile: promisify(fs.copyFile),
  // Read directory file names
  readDir: promisify(fs.readdir),
  readDirSync: fs.readdirSync,
  readDirResurvsive: readDir
}