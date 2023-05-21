import * as assert from 'assert';
import * as vscode from 'vscode';
import { Commands } from '../../constants';
import path = require('path');
import { after, before, describe, it } from 'mocha';
import * as fs from 'fs';
import { TESTFILE_DIR, TestExecutionHelper } from './TestExecutionHelper';
import * as TestFileContents from './TestFileContents';

const TENTY_SECONDS = 20000;

const primitiveVariablesBasicOperations =
  `
myPositiveInteger = 10
myNegativeInteger = -20

myPositiveInteger = myPositiveInteger - myNegativeInteger
myNegativeInteger = myNegativeInteger + myPositiveInteger
myPositiveInteger = myNegativeInteger / 10.5
myNegativeInteger = myNegativeInteger * 2.3

myPositiveFloat = 60.9
myNegativeFloat = -42.3

myPositiveFloat = myPositiveFloat - myNegativeFloat
myNegativeFloat = myNegativeFloat + myPositiveFloat
myPositiveFloat = myNegativeFloat / 5
myNegativeFloat = myNegativeFloat * 20.1


myString = 'Hello'
myEmptyString = ''

myEmptyString = 'World'
myString = myString + myEmptyString


myTrueBoolean = True
myFalseBoolean = False

myTrueBoolean = myTrueBoolean - myFalseBoolean
  `;

suite('The Backend when', () => {
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

      result = await executeExtension(testFile);
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
      ['isNone', 'str', 'None'],
      ['trueBool', 'bool', 'True'],
      ['falseBool', 'bool', 'False']
    ];
    variables.forEach(([name, type, value], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        assert.deepEqual(result.at(index)?.stack[0].locals.get(name), undefined);
        assert.deepEqual(result.at(index + 1)?.stack[0].locals.get(name), { type: type, value: value });
        assert.deepEqual(result.at(-1)?.stack[0].locals.get(name), { type: type, value: value });
      });
    });
  });

  describe('working with list', function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith("lists", "py", TestFileContents.LISTS);

      result = await executeExtension(testFile);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, any, number]> = [
      ['simpleList', 'list', '[1, 2, 3, 4, 5]', 1],
      ['stackedList', 'list', '[1, 2, [4, 5], [6, [7, 8, 9], [[10, 11], [23]]], 7]', 8],
      ['stackedMixedList', 'list', '[1, 2.0, ["4", 5.2], ["6", ["7", "8"], 9, [["10", 11.11], ["12"]]], "13", 14]', 15],

    ];
    variables.forEach(([name, type, value, size], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        assert.deepEqual(result.at(index)?.stack[0].locals.get(name), undefined);
        assert.deepEqual(result.at(index + 1)?.stack[0].locals.get(name)?.type, 'ref');
        assert.deepEqual(result.at(-1)?.stack[0].locals.get(name)?.type, 'ref');

        assert.deepEqual(result.at(index + 1)?.heap.size, size);
      });
    });
  });
});

describe('working with tuple', function () {
  this.timeout(TENTY_SECONDS);

  let result: BackendTrace | undefined;
  this.beforeAll(async function () {
    const testFile = await TestExecutionHelper.createTestFileWith("tuples", "py", TestFileContents.TUPLES);

    result = await executeExtension(testFile);
  });

  it("should create a defined Backend Trace", () => {
    assert.ok(result);
  });

  const variables: Array<[string, string, any, number]> = [
    ['simpleTuple', 'tuple', '(1, 2)', 1],
    ['stackedTuples', 'tuple', '((1, (2, 3)), (4, 5))', 5],
    ['stackedMixedTuples', 'tuple', '((1, ("2", 3)), (4.5, ((5, None), "7"))), "13", 14]', 11],

  ];
  variables.forEach(([name, type, value, size], index) => {
    it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
      if (!result) {
        assert.fail("No result was generated!");
      }

      assert.deepEqual(result.at(index)?.stack[0].locals.get(name), undefined);
      assert.deepEqual(result.at(index + 1)?.stack[0].locals.get(name)?.type, 'ref');
      assert.deepEqual(result.at(-1)?.stack[0].locals.get(name)?.type, 'ref');

      assert.deepEqual(result.at(index + 1)?.heap.size, size);
    });
  });
});
/** helper functions 
 * All helper Functions
 * TODO could be in in extra class 'ExecutionHelper' when more than this one tests exists
 */
async function executeExtension(testFile: vscode.Uri): Promise<BackendTrace | undefined> {
  return await vscode.commands.executeCommand(Commands.START_DEBUG, testFile, true);
}
