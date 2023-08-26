import * as assert from 'assert';
import { after, describe, it } from 'mocha';
import * as fs from 'fs';
import { TESTFILE_DIR_PYTHON, TestExecutionHelper, executeExtension, loadTraceFromContext } from '../TestExecutionHelper';
import * as TestFileContents from './PythonTestFileContents';

const TENTY_SECONDS = 20000;

suite('The Backend handling a python file when', () => {
  after(() => {
    fs.rm(TESTFILE_DIR_PYTHON, { recursive: true }, err => {
      if (err) { throw err; }
    });
  });

  describe("creating a Trace with all primitive Variables", function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_PYTHON,  "allPrimitiveVariables", "py", TestFileContents.ALL_PRIMITIVE_VARIABLES);

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

        const stack = result.at(index + 1)?.stack[0];
        if (!stack) {
          assert.fail("No Stack Elements");
        }

        stackContainsVariable([name, type, value], stack);
      });
    });
  });

  describe('working with list', function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_PYTHON,  "lists", "py", TestFileContents.LISTS);

      const context = await executeExtension(testFile);
      result = await loadTraceFromContext(testFile, context);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, any, number, number]> = [
      ['simpleList', 'list', '[1, 2, 3, 4, 5]', 1, 5],
      ['stackedList', 'list', '[1, 2, [4, 5], [6, [7, 8, 9], [[10, 11], [23]]], 7]', 8, 5],
      ['stackedMixedList', 'list', '[1, 2.0, ["4", 5.2], ["6", ["7", "8"], 9, [["10", 11.11], ["12"]]], "13", 14]', 15, 6],

    ];
    variables.forEach(([name, type, value, references, elementCount], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        const stack = result.at(index + 1)?.stack[0];
        if (!stack) {
          assert.fail("No Stack Elements");
        }

        const heap = result.at(index + 1)?.heap;
        if (!heap) {
          assert.fail("No Stack Elements");
        }

        stackAndHeapContainsVariable([name, type, references, elementCount], stack, heap);
      });
    });
  });

  describe('working with tuple', function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_PYTHON,  "tuples", "py", TestFileContents.TUPLES);

      const context = await executeExtension(testFile);
      result = await loadTraceFromContext(testFile, context);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, any, number, number]> = [
      ['simpleTuple', 'tuple', '(1, 2)', 1, 2],
      ['stackedTuples', 'tuple', '((1, (2, 3)), (4, 5))', 5, 2],
      ['stackedMixedTuples', 'tuple', '((1, ("2", 3)), (4.5, ((5, None), "7")))', 11, 2],

    ];
    variables.forEach(([name, type, value, references, elementCount], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        const stack = result.at(index + 1)?.stack[0];
        if (!stack) {
          assert.fail("No Stack Elements");
        }

        const heap = result.at(index + 1)?.heap;
        if (!heap) {
          assert.fail("No Stack Elements");
        }

        stackAndHeapContainsVariable([name, type, references, elementCount], stack, heap);
      });
    });
  });

  describe('working with sets', function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_PYTHON,  "sets", "py", TestFileContents.SETS);

      const context = await executeExtension(testFile);
      result = await loadTraceFromContext(testFile, context);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, any, number, number]> = [
      ['simpleSet', 'set', '{1, 2, 3, 4, 5}', 1, 5],
    ];
    variables.forEach(([name, type, value, references, elementCount], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        const stack = result.at(index + 1)?.stack[0];
        if (!stack) {
          assert.fail("No Stack Elements");
        }

        const heap = result.at(index + 1)?.heap;
        if (!heap) {
          assert.fail("No Stack Elements");
        }

        stackAndHeapContainsVariable([name, type, references, elementCount], stack, heap);
      });
    });
  });

  describe('working with dicts', function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_PYTHON, "dicts", "py", TestFileContents.DICTS);

      const context = await executeExtension(testFile);
      result = await loadTraceFromContext(testFile, context);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, any, number, number]> = [
      ['simpleDict', 'dict', '{ "a" : 1, "b" : 2, "c" : 3}', 1, 3],
      ['stackedDict', 'dict', '{ "a" : 1, "b" : { "ab" : { "1" : { "1" : 1, "2" : 2 }, "2" : { "2" : 2, "1" : 1} }}, "c" : 3 }', 6, 3],
      ['stackedMixedDict', 'dict', '{ "a" : 1.0, "b" : { "ab" : { "1" : { 1 : "1", 2.9 : "2" }, "2" : { 2 : "2", 1 : "1"} }}, "c" : 3.9 }', 11, 3]
    ];
    variables.forEach(([name, type, value, references, elementCount], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        const stack = result.at(index + 1)?.stack[0];
        if (!stack) {
          assert.fail("No Stack Elements");
        }

        const heap = result.at(index + 1)?.heap;
        if (!heap) {
          assert.fail("No Stack Elements");
        }

        stackAndHeapContainsVariable([name, type, references, elementCount], stack, heap);
      });
    });
  });

  describe('working with classes', function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_PYTHON, "classes", "py", TestFileContents.CLASSES);

      const context = await executeExtension(testFile);
      result = await loadTraceFromContext(testFile, context);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, any, number, number]> = [
      ['simpleClass', 'class', 'class simpleClass: testVar = 1; test2Var = 2;', 1, 2],
    ];
    variables.forEach(([name, type, value, references, elementCount], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        const stack = result.at(index + 1)?.stack[0];
        if (!stack) {
          assert.fail("No Stack Elements");
        }

        const heap = result.at(index + 1)?.heap;
        if (!heap) {
          assert.fail("No Stack Elements");
        }

        stackAndHeapContainsVariable([name, type, references, elementCount], stack, heap);
      });
    });
  });

  describe('working with mixed types', function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_PYTHON,  "mixed_types", "py", TestFileContents.MIXED_TYPES);

      const context = await executeExtension(testFile);
      result = await loadTraceFromContext(testFile, context);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, any, number, number]> = [
      ['tupleList', 'tuple', '([1, 2, [3, [4, 5, 5.5, 5.6, 5.7]]], [6, 7, [8, 9]])', 6, 2],
      ['listTuple', 'list', '[([1, 2], 3), 4, 5, [((6, 7), 8), 9, 10], 11, 12]', 12, 6],
      ['dictTupleList', 'dict', '{ "list" : [1, 2, 3], "tuple" : (1, 2), "tupleList" : ([1, 2], [3, 4])}', 18, 3],
    ];
    variables.forEach(([name, type, value, references, elementCount], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        const stack = result.at(index + 1)?.stack[0];
        if (!stack) {
          assert.fail("No Stack Elements");
        }

        const heap = result.at(index + 1)?.heap;
        if (!heap) {
          assert.fail("No Stack Elements");
        }

        stackAndHeapContainsVariable([name, type, references, elementCount], stack, heap);
      });
    });
  });

  describe('working with infinite references', function () {
    this.timeout(TENTY_SECONDS);

    let result: BackendTrace | undefined;
    this.beforeAll(async function () {
      const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_PYTHON,  "infinite_references", "py", TestFileContents.INFINITE_REFERENCES);

      const context = await executeExtension(testFile);
      result = await loadTraceFromContext(testFile, context);
    });

    it("should create a defined Backend Trace", () => {
      assert.ok(result);
    });

    const variables: Array<[string, string, any, number, number]> = [
      ['sampleList', 'list', '[]', 1, 0],
      ['sampleList', 'list', '[[]]', 1, 1],
    ];
    variables.forEach(([name, type, value, references, elementCount], index) => {
      it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
        if (!result) {
          assert.fail("No result was generated!");
        }

        const stack = result.at(index + 1)?.stack[0];
        if (!stack) {
          assert.fail("No Stack Elements");
        }

        const heap = result.at(index + 1)?.heap;
        if (!heap) {
          assert.fail("No Stack Elements");
        }

        stackAndHeapContainsVariable([name, type, references, elementCount], stack, heap);
      });
    });
  });
});

function stackContainsVariable([name, type, value]: [string, string, string | number], stack: any) {
  const keys = Array.from(Object.keys(stack.locals));
  const values = Array.from(Object.values(stack.locals));

  assert(keys.includes(name));
  assert.deepEqual(values[keys.indexOf(name)], { type: type, value: value });
}

function stackAndHeapContainsVariable([name, type, references, elementCount]: [string, string, number, number], stack: any, heap: any) {
  const stackKeys: any[] = Array.from(Object.keys(stack.locals));
  const stackValues: any[] = Array.from(Object.values(stack.locals));

  assert(stackKeys.includes(name));
  assert.deepEqual(stackValues[stackKeys.indexOf(name)].type, 'ref');

  const heapKeys: any[] = Array.from(Object.keys(heap));
  const heapValues: any[] = Array.from(Object.values(heap));

  const ref: number = stackValues[stackKeys.indexOf(name)].value;
  assert(heapKeys.includes('' + ref));
  assert.deepEqual(heapKeys.length, references);

  assert.deepEqual(heapValues[heapKeys.indexOf('' + ref)].type, type);
  assert.deepEqual(Object.keys(heapValues[heapKeys.indexOf('' + ref)].value).length, elementCount);
}
