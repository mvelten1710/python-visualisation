import * as assert from 'assert';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { Commands } from '../../constants';
// import * as myExtension from '../../extension';

suite('BackendTrace Suite', () => {
  test('Backend Trace Test: 1', async () => {
    // Execute Command to trigger debugging
    const trace = await vscode.commands.executeCommand(
      Commands.START_DEBUG,
      'file:///p%3A/Projekte/school/hmmm/test_files/suite1.py',
      true
    );
    // Wait for the Debugger to finish and and check for the backend trace
    // If backend trace exists check predefined value with content of file
    // If Trace doesnt exist => Error
    assert.ok(trace);
  }).timeout(10000);
});
