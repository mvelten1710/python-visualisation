import * as assert from 'assert';
import * as vscode from 'vscode';
import { Commands } from '../../constants';
import { after, describe, it } from 'mocha';
import * as fs from 'fs';
import { TESTFILE_DIR, TestExecutionHelper } from './TestExecutionHelper';
import * as TestFileContents from './TestFileContents';

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

        const ref = result.at(-1)?.stack[0].locals.get(name)?.value;
        assert.deepEqual(result.at(index + 1)?.heap.size, size);
        assert.deepEqual(result.at(index + 1)?.heap.get(ref as number)?.type, type);
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

        const ref = result.at(-1)?.stack[0].locals.get(name)?.value;
        assert.deepEqual(result.at(index + 1)?.heap.size, size);
        assert.deepEqual(result.at(index + 1)?.heap.get(ref as number)?.type, type);
      });
    });
  });

  describe('working with sets', function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith("sets", "py", TestFileContents.SETS);

      result = await executeExtension(testFile);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, any, number]> = [
      ['simpleSet', 'set', '{1, 2, 3, 4, 5}', 1],
    ];
    variables.forEach(([name, type, value, size], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        assert.deepEqual(result.at(index)?.stack[0].locals.get(name), undefined);
        assert.deepEqual(result.at(index + 1)?.stack[0].locals.get(name)?.type, 'ref');
        assert.deepEqual(result.at(-1)?.stack[0].locals.get(name)?.type, 'ref');

        const ref = result.at(-1)?.stack[0].locals.get(name)?.value;
        assert.deepEqual(result.at(index + 1)?.heap.size, size);
        assert.deepEqual(result.at(index + 1)?.heap.get(ref as number)?.type, type);
      });
    });
  });

  describe('working with dicts', function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith("dicts", "py", TestFileContents.DICTS);

      result = await executeExtension(testFile);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, any, number]> = [
      ['simpleDict', 'dict', '{ "a" : 1, "b" : 2, "c" : 3}', 1],
      ['stackedDict', 'dict', '{ "a" : 1, "b" : { "ab" : { "1" : { "1" : 1, "2" : 2 }, "2" : { "2" : 2, "1" : 1} }}, "c" : 3 }', 6],
      ['stackedMixedDict', 'dict', '{ "a" : 1.0, "b" : { "ab" : { "1" : { 1 : "1", 2.9 : "2" }, "2" : { 2 : "2", 1 : "1"} }}, "c" : 3.9 }', 11]
    ];
    variables.forEach(([name, type, value, size], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        assert.deepEqual(result.at(index)?.stack[0].locals.get(name), undefined);
        assert.deepEqual(result.at(index + 1)?.stack[0].locals.get(name)?.type, 'ref');
        assert.deepEqual(result.at(-1)?.stack[0].locals.get(name)?.type, 'ref');

        const ref = result.at(-1)?.stack[0].locals.get(name)?.value;
        assert.deepEqual(result.at(index + 1)?.heap.size, size);
        assert.deepEqual(result.at(index + 1)?.heap.get(ref as number)?.type, type);
      });
    });
  });

  describe('working with classes', function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith("classes", "py", TestFileContents.CLASSES);

      result = await executeExtension(testFile);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, any, number]> = [
      ['simpleClass', 'class', 'class simpleClass: testVar = 1; test2Var = 2;', 5], // FIXME 5 correct?
    ];
    variables.forEach(([name, type, value, size]) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }


        assert.deepEqual(result.at(-1)?.stack[0].locals.get(name)?.type, 'ref');

        const ref = result.at(-1)?.stack[0].locals.get(name)?.value;
        assert.deepEqual(result.at(-1)?.heap.size, size);
        assert.deepEqual(result.at(-1)?.heap.get(ref as number)?.type, type);
      });
    });
  });

  describe('working with mixed types', function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith("mixed_types", "py", TestFileContents.MIXED_TYPES);

      result = await executeExtension(testFile);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, any, number]> = [
      ['tupleList', 'tuple', '([1, 2, [3, [4, 5, 5.5, 5.6, 5.7]]], [6, 7, [8, 9]])', 6],
      ['listTuple', 'list', '[([1, 2], 3), 4, 5, [((6, 7), 8), 9, 10], 11, 12]', 12],
      ['dictTupleList', 'dict', '{ "list" : [1, 2, 3], "tuple" : (1, 2), "tupleList" : ([1, 2], [3, 4])}', 18],
    ];
    variables.forEach(([name, type, value, size], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        assert.deepEqual(result.at(index)?.stack[0].locals.get(name), undefined);
        assert.deepEqual(result.at(index + 1)?.stack[0].locals.get(name)?.type, 'ref');
        assert.deepEqual(result.at(-1)?.stack[0].locals.get(name)?.type, 'ref');

        const ref = result.at(-1)?.stack[0].locals.get(name)?.value;
        assert.deepEqual(result.at(index + 1)?.heap.size, size);
        assert.deepEqual(result.at(index + 1)?.heap.get(ref as number)?.type, type);
      });
    });
  });

  describe('working with infinite references', function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith("infinite_references", "py", TestFileContents.INFINITE_REFERENCES);

      result = await executeExtension(testFile);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, any, number]> = [
      ['sampleList', 'list', '[]', 1],
      ['sampleList', 'list', '[[]]', 1],
    ];
    variables.forEach(([name, type, value, size], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        assert.deepEqual(result.at(-1)?.stack[0].locals.get(name)?.type, 'ref');

        const ref = result.at(-1)?.stack[0].locals.get(name)?.value;
        assert.deepEqual(result.at(index + 1)?.heap.size, size);
        assert.deepEqual(result.at(index + 1)?.heap.get(ref as number)?.type, type);
      });
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
