import * as assert from 'assert';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { Commands } from '../../constants';
import path = require('path');

suite('BackendTrace Suite', () => {
  let files = Array<vscode.Uri>();
  before(async () => {
    const filePath = path.join(path.resolve(__dirname), '../test_files');
    const fileCount = await vscode.workspace.findFiles('/suite_*.py');
    for (let i = 0; i < 1; i++) {
      files.push(vscode.Uri.file(path.join(filePath, `suite_${i + 1}.py`)));
    }
  });

  after(() => {
    vscode.window.showInformationMessage('All tests done!');
  });

  async function executeExtension(testFile: vscode.Uri): Promise<BackendTrace | undefined> {
    return await vscode.commands.executeCommand(Commands.START_DEBUG, testFile, true);
  }

  /**
   * Tests the initialization of primitive types.
   */
  test('Backend Trace Test: Primitive Variables initialization', async () => {
    const trace = await executeExtension(files[0]);
    assert.ok(trace);
  }).timeout(5000);

  /**
   * Tests the basic operation of primitive types.
   */
  test('Backend Trace Test: Primitive Variables Basic Operations', async () => {
    const trace = await executeExtension(files[1]);
    assert.ok(trace);
  }).timeout(5000);

  /**
   * Tests the initialization for collection types.
   */
  test('Backend Trace Test: Collection Variables Initialization', async () => {
    const trace = await executeExtension(files[2]);
    assert.ok(trace);
  }).timeout(5000);

  /**
   * Tests the basic operations of collection types
   */
  test('Backend Trace Test: Collection Variables Basic Operations', async () => {
    const trace = await executeExtension(files[3]);
    assert.ok(trace);
  }).timeout(5000);

  /**
   * Tests the collections with collections in them
   */
  test('Backend Trace Test: Collection Variables With Collection Content', async () => {
    const trace = await executeExtension(files[4]);
    assert.ok(trace);
  }).timeout(5000);

  test('Backend Trace Test: Time Test', async () => {
    const trace = await executeExtension(files[5]);
    assert.ok(trace);
  }).timeout(5000);
});
