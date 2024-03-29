import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { addVariableDeclarations } from '../src/index';

readdirSync(join(__dirname, 'fixtures')).forEach(testFixture);

function testFixture(name: string) {
  let config = requireFixtureModule(name, 'config.ts');
  (config.skip ? test.skip : config.only ? test.only : test)(
    config.description,
    () => {
      expect(
        addVariableDeclarations(readFixtureFile(name, 'input.js')).code
      ).toMatchSnapshot();
    }
  );
}

interface Fixture {
  skip?: boolean;
  only?: boolean;
  noop?: boolean;
  description: string;
}

function requireFixtureModule(name: string, filename: string): Fixture {
  let path = fixtureFilePath(name, filename);
  return require(path);
}

function readFixtureFile(name: string, filename: string): string {
  let path = fixtureFilePath(name, filename);
  return readFileSync(path, { encoding: 'utf8' });
}

function fixtureFilePath(name: string, filename: string) {
  return join(__dirname, 'fixtures', name, filename);
}
