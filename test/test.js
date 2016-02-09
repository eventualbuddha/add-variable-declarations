import { join } from 'path';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import refactor from '../src/index.js';
import { strictEqual as eq } from 'assert';

readdirSync(join(__dirname, 'fixtures')).forEach(testFixture);

function testFixture(name) {
  let config = requireFixtureModule(name, 'config.js');
  it(config.description, () => {
    let input = readFixtureFile(name, 'input.js');
    let actual = refactor(input);
    writeFixtureFile(name, '_actual.js', actual.code);
    let expected = config.noop ? input : readFixtureFile(name, 'expected.js');
    eq(actual.code, expected);
  });
}

function requireFixtureModule(name, filename) {
  let path = fixtureFilePath(name, filename);
  return require(path);
}

function readFixtureFile(name, filename) {
  let path = fixtureFilePath(name, filename);
  return readFileSync(path, { encoding: 'utf8' });
}

function writeFixtureFile(name, filename, content) {
  let path = fixtureFilePath(name, filename);
  writeFileSync(path, content, { encoding: 'utf8' });
}

function fixtureFilePath(name, filename) {
  return join(__dirname, 'fixtures', name, filename);
}
