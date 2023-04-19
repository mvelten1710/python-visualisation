import * as assert from 'assert';
import * as vscode from 'vscode';
import { Commands } from '../../constants';
import path = require('path');
import { after, describe, it } from 'mocha';
import util = require('util');
import * as fs from 'fs';

const TESTFILE_DIR = path.join(path.resolve(__dirname), "testfiles");
const TENTY_SECONDS = 20000;
const singleVariable = `age = 10`;
const primitiveVariablesInitialization =
  `
myPositiveInteger = 100
myNegativeInteger = -420

myPositiveFloat = 60.9
myNegativeFloat = -42.3

myString = 'Hello World'
myEmptyString = ''
`;
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

  /** Basic functionality
   * Creates a Trace
   * Tace contains correct input
   * Deletes tmp-Files like <name>_debug
   */
  describe("creating a simple Trace", function () {
    it("should create a Trace", async function () {
      const testFile = await createTestFileWith("singleVariableTrace", "py", singleVariable);
      if (!testFile) {
        this.skip();
      }

      const result = await executeExtension(testFile);

      assert.ok(result);
    }).timeout(TENTY_SECONDS);

    it("should contains with one Variable in File one BackendTrace-Element", async function () {
      const testFile = await createTestFileWith("singleVariableContains", "py", singleVariable);
      if (!testFile) {
        this.skip();
      }

      const result = await executeExtension(testFile);

      if (!result) {
        assert.fail("No result was generated!");
      }

      assert.equal(result.length, 2);
      assert.equal(result[0].stack[0].locals.size, 0);
      assert.equal(result[0].heap.size, 0);
      assert.equal(result[1].stack[0].locals.get("age")?.type, 'int');
      assert.equal(result[1].stack[0].locals.get("age")?.value, 10);
      assert.equal(result[1].heap.size, 0);
    }).timeout(TENTY_SECONDS);

    it("should deletes temporary created Files", async function () {
      const testFile = await createTestFileWith("singleVariableDelete", "py", singleVariable);
      if (!testFile) {
        this.skip();
      }

      await executeExtension(testFile);

      fs.readdir(path.join(TESTFILE_DIR, `/singleVariableDelete/`), (err, fileNames: string[]) => {
        if (err) { throw err; }
        assert.ok(!fileNames.includes("singleVariableDelete_debug"));
      });
    }).timeout(TENTY_SECONDS);
  });

  /** Primitive Variables
   * Tests the initialization of primitive types.
   * Tests the basic operation of primitive types.
   */
  describe('working with primitive variables', function () {
    it('should state all types correctly', async function () {
      const testFile = await createTestFileWith("primitiveVariablesInitialization", "py", primitiveVariablesInitialization);
      if (!testFile) {
        this.skip();
      }

      const result = await executeExtension(testFile);

      assert.ok(result);
    }).timeout(TENTY_SECONDS);

    it('Basic Operations', async function () {
      const testFile = await createTestFileWith("primitiveVariablesBasicOperations", "py", primitiveVariablesBasicOperations);
      if (!testFile) {
        this.skip();
      }

      const result = await executeExtension(testFile);

      assert.ok(result);
    }).timeout(TENTY_SECONDS);
  });

  /** Collection Types
   * Tests the initialization for collection types.
   * Tests the basic operations of collection types
   * Tests the collections with collections in them
   */

  /**
   * Tests that the execution time is not too long
   */
});

/** helper functions 
 * All helper Functions
 * TODO could be in in extra class 'ExecutionHelper' when more than this one tests exists
 */
async function executeExtension(testFile: vscode.Uri): Promise<BackendTrace | undefined> {
  return await vscode.commands.executeCommand(Commands.START_DEBUG, testFile, true);
}

async function createTestFileWith(fileName: string, fileType: string, content: string): Promise<vscode.Uri | undefined> {
  const testFileUri = vscode.Uri.file(path.join(TESTFILE_DIR + `/${fileName}/${fileName}.${fileType}`));

  const utf8Content = new util.TextEncoder().encode(content);
  await vscode.workspace.fs.writeFile(testFileUri, utf8Content);

  return testFileUri;
}
