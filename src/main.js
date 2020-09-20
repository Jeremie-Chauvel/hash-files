#!/usr/bin/env node
// recursively hash a directory
const crypto = require('crypto'),
  path = require('path'),
  fs = require('fs')

const directoryPath = process.argv[2]

const IGNORED_PATHS = ['.git', 'node_modules']
const HASH_ALGORITHM = 'sha1'

const createHashFromFile = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash(HASH_ALGORITHM)
    fs.createReadStream(filePath)
      .on('data', (data) => hash.update(data))
      .on('error', () => reject(`error reading: ${filePath}`))
      .on('end', () => resolve(hash.digest('hex')))
  })

const createHashForPath = (pathString) => {
  const pathObject = fs.lstatSync(pathString)
  if (pathObject.isDirectory()) {
    return hashDir(pathString)
  } else if (pathObject.isFile()) {
    return createHashFromFile(pathString)
  } else if (pathObject.isSymbolicLink()) {
    return new Promise((resolve, reject) => {
      fs.readlink(pathString, (error, linkString) => {
        if (error) {
          reject('Unable to read symbolic link: ' + error)
        }
        resolve(
          createHashForPath(path.join(path.dirname(pathString), linkString))
        )
      })
    })
  } else {
    throw new Error(`not a file or directory: ${pathString}`)
  }
}

const hashDir = (directoryPath) =>
  new Promise((resolve, reject) => {
    fs.readdir(directoryPath, (error, files) => {
      if (error) {
        reject('Unable to scan directory: ' + error)
      }

      Promise.all(
        files
          .filter(
            (file) =>
              !IGNORED_PATHS.some((ignoredPath) => file.includes(ignoredPath))
          )
          .map((file) => createHashForPath(path.join(directoryPath, file)))
      )
        .then((arrayOfHashes) => {
          const hash = crypto.createHash(HASH_ALGORITHM)
          arrayOfHashes.forEach((fileHash) => hash.update(fileHash))
          resolve(hash.digest('hex'))
        })
        .catch((error) => reject(error))
    })
  })

createHashForPath(directoryPath).then(console.log)
