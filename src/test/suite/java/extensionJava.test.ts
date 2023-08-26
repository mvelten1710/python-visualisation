import * as assert from 'assert';
import { after, describe, it } from 'mocha';
import * as fs from 'fs';
import { TESTFILE_DIR_JAVA, TestExecutionHelper, executeExtension, loadTraceFromContext } from '../TestExecutionHelper';
import * as TestFileContents from './JavaTestFileContents';

const TENTY_SECONDS = 50000;

suite('The Backend handling a java file when', () => {
    after(() => {
        fs.rm(TESTFILE_DIR_JAVA, { recursive: true }, err => {
            if (err) { throw err; }
        });
    });

    describe("creating a Trace with all primitive Variables", function () {
        this.timeout(TENTY_SECONDS);

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
});

function stackContainsVariable([name, type, value]: [string, string, string | number], stack: any) {
    const keys = Array.from(Object.keys(stack.locals));
    const values = Array.from(Object.values(stack.locals));

    assert(keys.includes(name));
    assert.deepEqual(values[keys.indexOf(name)], { type: type, value: value });
}
