import { join } from 'path';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import refactor from '../src/index';
import { strictEqual as eq } from 'assert';

readdirSync(join(__dirname, 'fixtures')).forEach(testFixture);

function testFixture(name: string) {
  let config = requireFixtureModule(name, 'config.js');
  (config.skip ? it.skip : config.only ? it.only : it)(config.description, () => {
    let input = readFixtureFile(name, 'input.js');
    let actual = refactor(input);
    writeFixtureFile(name, '_actual.js', actual.code);
    let expected = config.noop ? input : readFixtureFile(name, 'expected.js');
    eq(actual.code, expected);
  });
}

type Fixture = {
  skip?: boolean;
  only?: boolean;
  noop?: boolean;
  description: string;
};

function requireFixtureModule(name: string, filename: string): Fixture {
  let path = fixtureFilePath(name, filename);
  return require(path);
}

function readFixtureFile(name: string, filename: string): string {
  let path = fixtureFilePath(name, filename);
  return readFileSync(path, { encoding: 'utf8' });
}

function writeFixtureFile(name: string, filename: string, content: string) {
  let path = fixtureFilePath(name, filename);
  writeFileSync(path, content, { encoding: 'utf8' });
}

function fixtureFilePath(name: string, filename: string) {
  return join(__dirname, 'fixtures', name, filename);
}
