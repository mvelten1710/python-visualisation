import * as assert from 'assert';
import { after, describe, it } from 'mocha';
import * as fs from 'fs';
import { TESTFILE_DIR, TestExecutionHelper, executeExtension, loadTraceFromContext } from '../TestExecutionHelper';
import * as TestFileContents from '../TestFileContents';

const TENTY_SECONDS = 20000;

suite('The Backend handling a python file when', () => {
  after(() => {
    fs.rm(TESTFILE_DIR, { recursive: true }, err => {
      if (err) { throw err; }
    });
  });

  describe("creating a Trace with all primitive Variables", function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith("allPrimitiveVariables", "py", TestFileContents.ALL_PRIMITIVE_VARIABLES);

      const context = await executeExtension(testFile);
      result = await loadTraceFromContext(testFile, context);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, number | string]> = [
      ['positiveInt', 'int', 1],
      ['negativeInt', 'int', -1],
      ['positiveFloat', 'float', 1.0],
      ['negativeFloat', 'float', -1.0],
      ['emptyString', 'str', "''"],
      ['fullString', 'str', "'Hello World!'"],
      ['isNone', 'none', 'None'],
      ['trueBool', 'bool', 'True'],
      ['falseBool', 'bool', 'False']
    ];

    variables.forEach(([name, type, value], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        const stackElem = result.at(index + 1)?.stack[0];
        if (!stackElem) {
          assert.fail("No Stack Elements");
        }
        const keys = Array.from(Object.keys(stackElem.locals));
        const values = Array.from(Object.values(stackElem.locals));

        assert(keys.includes(name));
        assert.deepEqual(values[keys.indexOf(name)], { type: type, value: value });
      });
    });
  });
});
