const { resolve, sep, join } = require('path');

function test(projectPath, filePath) {
  const absPath = join(projectPath, filePath);
  const resolvedProject = resolve(projectPath);
  const prefix = resolvedProject.endsWith(sep) ? resolvedProject : resolvedProject + sep;
  const isAllowed = resolve(absPath).startsWith(prefix);
  console.log(`project: ${projectPath}, file: ${filePath} -> allowed: ${isAllowed}, absPath: ${resolve(absPath)}, prefix: ${prefix}`);
}

test('/tmp/my-project', 'package.json');
test('/tmp/my-project', '../my-project2/package.json');
test('/tmp/my-project', '../../etc/passwd');
test('/tmp/my-project/', 'package.json');
test('/tmp/my-project/', '../my-project2/package.json');
test('/', 'etc/passwd');
test('/', '../etc/passwd');
