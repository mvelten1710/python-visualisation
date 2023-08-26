import * as assert from 'assert';
import { after, describe, it } from 'mocha';
import * as fs from 'fs';
import { TESTFILE_DIR_JAVA, TestExecutionHelper, executeExtension, loadTraceFromContext } from '../TestExecutionHelper';
import * as TestFileContents from './JavaTestFileContents';

const MAX_TEST_DURATION = 30000;

suite('The Backend handling a java file when', () => {
    after(() => {
        fs.rm(TESTFILE_DIR_JAVA, { recursive: true }, err => {
            if (err) { throw err; }
        });
    });

    describe("creating a Trace with all primitive Variables", function () {
        this.timeout(MAX_TEST_DURATION);

        let result: BackendTrace | undefined;
        this.beforeAll(async function () {
            const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_JAVA, "JavaPrimitiveVariableTestClass", "java", TestFileContents.ALL_PRIMITIVE_VARIABLES);

            const context = await executeExtension(testFile);
            result = await loadTraceFromContext(testFile, context);
        });

        it("should create a defined Backend Trace", () => {
            assert.ok(result);
        });

        const variables: Array<[string, string, number | string]> = [
            ['positiveByte', 'byte', 1],
            ['negativeByte', 'byte', -1],
            ['positiveShort', 'short', 150],
            ['negativeShort', 'short', -150],
            ['positiveInt', 'int', 55555],
            ['negativeInt', 'int', -55555],
            ['positiveLong', 'long', 2947483647],
            ['negativeLong', 'long', -2947483647],
            ['positiveFloat', 'float', 1.0123],
            ['negativeFloat', 'float', -1.0123],
            ['positiveDouble', 'double', 1.01234],
            ['negativeDouble', 'double', -1.01234],
            ['fullChar', 'char', 'a'],
            ['trueBool', 'bool', 'true'],
            ['falseBool', 'bool', 'false'],
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

    describe("creating a Trace with all Wrapper-Variables", function () {
        this.timeout(MAX_TEST_DURATION);

        let result: BackendTrace | undefined;
        this.beforeAll(async function () {
            const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_JAVA, "JavaWrapperVariableTestClass", "java", TestFileContents.ALL_WRAPPER_VARIABLES);

            const context = await executeExtension(testFile);
            result = await loadTraceFromContext(testFile, context);
        });

        it("should create a defined Backend Trace", () => {
            assert.ok(result);
        });

        const variables: Array<[string, string, any, number, number]> = [
            ['positiveByte', 'wrapper', 1, 1, 1],
            ['negativeByte', 'wrapper', -1, 2, 1],
            ['positiveShort', 'wrapper', 150, 3, 1],
            ['negativeShort', 'wrapper', -150, 4, 1],
            ['positiveInt', 'wrapper', 55555, 5, 1],
            ['negativeInt', 'wrapper', -55555, 6, 1],
            ['positiveLong', 'wrapper', 2947483647, 7, 1],
            ['negativeLong', 'wrapper', -2947483647, 8, 1],
            ['positiveFloat', 'wrapper', 1.0123, 9, 1],
            ['negativeFloat', 'wrapper', -1.0123, 10, 1],
            ['positiveDouble', 'wrapper', 1.01234, 11, 1],
            ['negativeDouble', 'wrapper', -1.01234, 12, 1],
            ['fullChar', 'wrapper', 'a', 13, 1],
            ['trueBool', 'wrapper', 'true', 14, 1],
            ['falseBool', 'wrapper', 'false', 15, 1],
            ['emptyString', 'wrapper', '', 16, 2],
            ['fullString', 'wrapper', 'Hello World!', 17, 2],
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

    describe("creating a Trace with Array-Variables", function () {
        this.timeout(MAX_TEST_DURATION);

        let result: BackendTrace | undefined;
        this.beforeAll(async function () {
            const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_JAVA, "JavaArrayVariableTestClass", "java", TestFileContents.ARRAY_VARIABLES);

            const context = await executeExtension(testFile);
            result = await loadTraceFromContext(testFile, context);
        });

        it("should create a defined Backend Trace", () => {
            assert.ok(result);
        });

        const variables: Array<[string, string, any, number, number]> = [
            ['intArray', 'int[]', '{ 1, 2, 3, 4}', 1, 4],
            ['integerArray', 'Integer[]', '{ 1, 2, 3, 4}', 6, 4],
            ['dimIntArray', 'int[][]', '{ { 1}, { 2}, { 3, 4}}', 10, 3],
            ['dimIntegerArray', 'Integer[][]', '{ { 1}, { 2}, { 3, 4}}', 14, 3],
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

    describe("creating a Trace with Class", function () {
        this.timeout(MAX_TEST_DURATION);

        let result: BackendTrace | undefined;
        this.beforeAll(async function () {
            const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_JAVA, "JavaClassTestClass", "java", TestFileContents.CLASS_VARIABLES);

            const context = await executeExtension(testFile);
            result = await loadTraceFromContext(testFile, context);
        });

        it("should create a defined Backend Trace", () => {
            assert.ok(result);
        });

        const variables: Array<[string, string, any, number, number]> = [
            ['testClass', 'class', 'class simpleClass: x = 1; y = 2', 2, 2]
        ];

        variables.forEach(([name, type, value, references, elementCount], index) => {
            it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
                if (!result) {
                    assert.fail("No result was generated!");
                }

                const stack = result.at(-1)?.stack[0];
                if (!stack) {
                    assert.fail("No Stack Elements");
                }

                const heap = result.at(-1)?.heap;
                if (!heap) {
                    assert.fail("No Stack Elements");
                }

                stackAndHeapContainsVariable([name, type, references, elementCount], stack, heap);
            });
        });
    });

    describe("creating a Trace with ArrayList", function () {
        this.timeout(MAX_TEST_DURATION);

        let result: BackendTrace | undefined;
        this.beforeAll(async function () {
            const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_JAVA, "JavaArrayListTestClass", "java", TestFileContents.ARRAY_LIST_VARIABLES);

            const context = await executeExtension(testFile);
            result = await loadTraceFromContext(testFile, context);
        });

        it("should create a defined Backend Trace", () => {
            assert.ok(result);
        });

        const variables: Array<[string, string, any, number, number]> = [
            ['arrayList', 'ArrayList', '{ 3, 2, 1}', 4, 3]
        ];

        variables.forEach(([name, type, value, references, elementCount], index) => {
            it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
                if (!result) {
                    assert.fail("No result was generated!");
                }

                const stack = result.at(-1)?.stack[0];
                if (!stack) {
                    assert.fail("No Stack Elements");
                }

                const heap = result.at(-1)?.heap;
                if (!heap) {
                    assert.fail("No Stack Elements");
                }

                stackAndHeapContainsVariable([name, type, references, elementCount], stack, heap);
            });
        });
    });

    describe("creating a Trace with LinkedList", function () {
        this.timeout(MAX_TEST_DURATION);

        let result: BackendTrace | undefined;
        this.beforeAll(async function () {
            const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_JAVA, "JavaLinkedListTestClass", "java", TestFileContents.LINKED_LIST_VARIABLES);

            const context = await executeExtension(testFile);
            result = await loadTraceFromContext(testFile, context);
        });

        it("should create a defined Backend Trace", () => {
            assert.ok(result);
        });

        const variables: Array<[string, string, any, number, number]> = [
            ['linkedList', 'LinkedList', '{ 3, 2, 1}', 4, 3]
        ];

        variables.forEach(([name, type, value, references, elementCount], index) => {
            it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
                if (!result) {
                    assert.fail("No result was generated!");
                }

                const stack = result.at(-1)?.stack[0];
                if (!stack) {
                    assert.fail("No Stack Elements");
                }

                const heap = result.at(-1)?.heap;
                if (!heap) {
                    assert.fail("No Stack Elements");
                }

                stackAndHeapContainsVariable([name, type, references, elementCount], stack, heap);
            });
        });
    });

    describe("creating a Trace with HashMap", function () {
        this.timeout(MAX_TEST_DURATION);

        let result: BackendTrace | undefined;
        this.beforeAll(async function () {
            const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_JAVA, "JavaHashMapTestClass", "java", TestFileContents.HASH_MAP_VARIABLES);

            const context = await executeExtension(testFile);
            result = await loadTraceFromContext(testFile, context);
        });

        it("should create a defined Backend Trace", () => {
            assert.ok(result);
        });

        const variables: Array<[string, string, any, number, number]> = [
            ['hashMap', 'map', '{ {Audi : 1}, {BMW : 2}}', 5, 2]
        ];

        variables.forEach(([name, type, value, references, elementCount], index) => {
            it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
                if (!result) {
                    assert.fail("No result was generated!");
                }

                const stack = result.at(-1)?.stack[0];
                if (!stack) {
                    assert.fail("No Stack Elements");
                }

                const heap = result.at(-1)?.heap;
                if (!heap) {
                    assert.fail("No Stack Elements");
                }

                stackAndHeapContainsVariable([name, type, references, elementCount], stack, heap);
            });
        });
    });

    describe("creating a Trace with HashSet", function () {
        this.timeout(MAX_TEST_DURATION);

        let result: BackendTrace | undefined;
        this.beforeAll(async function () {
            const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR_JAVA, "JavaHashSetTestClass", "java", TestFileContents.HASH_SET_VARIABLES);

            const context = await executeExtension(testFile);
            result = await loadTraceFromContext(testFile, context);
        });

        it("should create a defined Backend Trace", () => {
            assert.ok(result);
        });

        const variables: Array<[string, string, any, number, number]> = [
            ['hashSet', 'HashSet', '{ 1, 2 }', 3, 2]
        ];

        variables.forEach(([name, type, value, references, elementCount], index) => {
            it(`should contain the variable ${name} as ${type} with value ${value}`, () => {
                if (!result) {
                    assert.fail("No result was generated!");
                }

                const stack = result.at(-1)?.stack[0];
                if (!stack) {
                    assert.fail("No Stack Elements");
                }

                const heap = result.at(-1)?.heap;
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
