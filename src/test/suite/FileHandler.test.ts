import * as assert from 'assert';
import * as fs from 'fs';
import { after, describe, it } from 'mocha';
import * as vscode from 'vscode';
import * as FileHandler from '../../FileHandler';
import { TESTFILE_DIR, TestExecutionHelper } from './TestExecutionHelper';
import util = require('util');

suite('A FileHandler when', () => {
    after(() => {
        fs.rm(TESTFILE_DIR, { recursive: true }, err => {
            if (err) { throw err; }
        });
    });

    describe("getContentOf a file", function () {
        it("should return correct content of the file", async function () {
            const fileContent = "Test!\nThis is the content of a test file!\nWith numbers 12345\n";
            const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR, "SampleContentFile", "txt", fileContent);
            if (!testFile) {
                this.skip();
            }

            const result = await FileHandler.getContentOf(testFile);

            assert.equal(result, fileContent);
        });
    });

    describe("deleteFile", function () {
        it("should delete the file", async function () {
            const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR, "SampleDeleteFile", "txt", '');
            if (!testFile) {
                this.skip();
            }

            await FileHandler.deleteFile(testFile);

            fs.readdir(TESTFILE_DIR, (err, fileNames: string[]) => {
                if (err) { throw err; }
                assert.ok(!fileNames.includes("SampleDeleteFile"));
            });
        });
    });

    describe("duplicateFileAndExtendWithPass", function () {
        it("should create a file with the _debug as addition", async function () {
            const fileContent = "Test\n";
            const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR, "SampleTempFile", "py", fileContent);
            if (!testFile) {
                this.skip();
            }

            await FileHandler.duplicateFileAndExtendWithPass(testFile, fileContent);

            fs.readdir(TESTFILE_DIR, (err, fileNames: string[]) => {
                if (err) { throw err; }
                assert.ok(fileNames.includes("SampleTempFile_debug.py"));
            });
        });

        it("should add a pass at the end of the file", async function () {
            const fileContent = "Test\n";
            const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR, "SampleTempFile", "py", fileContent);
            if (!testFile) {
                this.skip();
            }

            const tempFile = await FileHandler.duplicateFileAndExtendWithPass(testFile, fileContent);
            if (!tempFile) {
                assert.fail("No temp file was generated!");
            }
            const result = new util.TextDecoder('utf-8').decode(await vscode.workspace.fs.readFile(tempFile));

            assert.equal(result, fileContent + "\npass");
        });
    });

    describe("createBackendTraceOutput", function () {
        it("should create correct named file", async function () {
            const testFile = await TestExecutionHelper.createTestFileWith(TESTFILE_DIR, "SampleTraceFile", "py", '');
            if (!testFile) {
                this.skip();
            }
            const backendTrace: BackendTrace = [];

            await FileHandler.createBackendTraceOutput(backendTrace, testFile);

            fs.readdir(TESTFILE_DIR, (err, fileNames: string[]) => {
                if (err) { throw err; }
                assert.ok(fileNames.includes("backend_trace_SampleTraceFile.json"));
            });
        });
    });

    describe("extractLanguage should evaluate the extension to supported language", function () {
        it("when with python '.py' ending", async function () {
            const testFileName = vscode.Uri.file("testFile.py");

            const result = FileHandler.extractLanguage(testFileName);

            assert.ok(result);
            assert.equal(result, 'python');
        });

        it("when with java '.java' ending", async function () {
            const testFileName = vscode.Uri.file("testFile.java");

            const result = FileHandler.extractLanguage(testFileName);

            assert.ok(result);
            assert.equal(result, 'java');
        });
    });
});
