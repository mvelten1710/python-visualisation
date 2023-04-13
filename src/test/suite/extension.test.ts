import * as assert from 'assert';
import * as vscode from 'vscode';
import { Commands } from '../../constants';
import path = require('path');
import { before, after, describe, it } from 'mocha';
import * as fs from 'fs';

const TEN_SECONDS = 10000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

suite('BackendTrace Suite', () => {
  let files = new Map<string, vscode.Uri>();

  before(async () => {
    const filePath = path.join(path.resolve(__dirname), '/test_files');

    fs.readdir(filePath, (err, fileNames: string[]) => {
      fileNames.forEach((fileName) => {
        const uri = vscode.Uri.file(path.join(filePath + '/' + fileName));
        files.set(fileName.replace('.py', ''), uri);
      });
    });
  });

  after(() => {
    vscode.window.showInformationMessage('All tests done!');
  });

  async function executeExtension(testFile: vscode.Uri): Promise<BackendTrace | undefined> {
    return await vscode.commands.executeCommand(Commands.START_DEBUG, testFile, true);
  }

  /** Primitive Variables
   * Tests the initialization of primitive types.
   * Tests the basic operation of primitive types.
   */
  describe('Primitive Variables', function () {
    it('Initialization', async function () {
      const testFile = files.get('primitiveVariablesInitialization');
      if (!testFile) {
        this.skip();
      }

      const result = await executeExtension(testFile);

      assert.ok(result);
    }).timeout(2 * TEN_SECONDS);

    it('Basic Operations', async function () {
      // primitiveVariablesBasicOperations
      const testFile = files.get('primitiveVariablesBasicOperations');
      if (!testFile) {
        this.skip();
      }

      const result = await executeExtension(testFile);

      assert.ok(result);
    }).timeout(2 * TEN_SECONDS);
  });

  /** Collection Types
   * Tests the initialization for collection types.
   * Tests the basic operations of collection types
   * Tests the collections with collections in them
   */
  describe('Collection Types', () => {
    it('Initialization', async function () {
      const testFile = files.get('');
      if (!testFile) {
        this.skip();
      }

      const result = await executeExtension(testFile);

      assert.ok(result);
    });

    it('Basic Operations', async function () {
      const testFile = files.get('');
      if (!testFile) {
        this.skip();
      }

      const result = await executeExtension(testFile);

      assert.ok(result);
    });

    it('Collections with Collections', async function () {
      const testFile = files.get('');
      if (!testFile) {
        this.skip();
      }

      const result = await executeExtension(testFile);

      assert.ok(result);
    });
  }).timeout(TEN_SECONDS);

  /**
   * Tests that the execution time is not too long
   */
});
