const fs = require('fs').promises;
const createReadStream = require('fs').createReadStream;

const path = require('path');
const readline = require('readline');
const process = require('child_process');

const { createObjectCsvWriter } = require('csv-writer');

const project = 'atreus-react';
const filePath = path.resolve('./' + project);

const ignoreDir = ['node_modules', 'dist', '.git'];
const ignoreFileSuffix = ['.png', '.woff', '.ttf'];

async function findChineseTextInFile(filePath, result) {
  const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  const reg = new RegExp('^((?!(\\*|//)).)+[\\u4e00-\\u9fa5]');

  for await (const line of rl) {
    const matches = line.match(reg);
    if (matches) {
      // !result.includes(filePath) && result.push(filePath); // TODO
      result.push(matches.join(''));
    }
  }
}

async function findChineseTextInDirectory(directory, result) {
  const files = await fs.readdir(directory);

  for (const file of files) {
    const fileDir = path.join(directory, file);
    const stats = await fs.stat(fileDir);

    if (stats.isDirectory() && !ignoreDir.includes(file)) {
      await findChineseTextInDirectory(fileDir, result);
    }

    if (stats.isFile() && !ignoreFileSuffix.some((suffix) => file.includes(suffix))) {
      await findChineseTextInFile(fileDir, result);
    }
  }
}

(async () => {
  const result = [];
  const path = `${project}.csv`;
  const targetPath = `${project}_translate.csv`;
  await findChineseTextInDirectory(filePath, result);

  const csvWriter = createObjectCsvWriter({
    path,
    header: [{ id: 'chinese', title: 'Chinese Text' }],
    encoding: 'utf-8',
  });

  const records = result.map((text) => ({ chinese: text }));

  await csvWriter.writeRecords(records);

  // 格式转换
  process.exec(`iconv -f UTF-8 -t GB18030 ${path} > ${targetPath}`, function () {
    fs.unlink(path);
    console.log('CSV文件已创建:', targetPath);
  });
})();
