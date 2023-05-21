import * as assert from 'assert';
import * as fs from 'fs';
import { after, describe, it } from 'mocha';
import * as vscode from 'vscode';
import * as FileHandler from '../../backend/FileHandler';
import { TESTFILE_DIR, TestExecutionHelper } from './TestExecutionHelper';
import path = require('path');
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
            const testFile = await TestExecutionHelper.createTestFileWith("SampleContentFile", "txt", fileContent);
            if (!testFile) {
                this.skip();
            }

            const result = await FileHandler.getContentOf(testFile);

            assert.equal(result, fileContent);
        });
    });

    describe("deleteFile", function () {
        it("should delete the file", async function () {
            const testFile = await TestExecutionHelper.createTestFileWith("SampleDeleteFile", "txt", '');
            if (!testFile) {
                this.skip();
            }

            await FileHandler.deleteFile(testFile);

            fs.readdir(path.join(TESTFILE_DIR, `/SampleDeleteFile/`), (err, fileNames: string[]) => {
                if (err) { throw err; }
                assert.ok(!fileNames.includes("SampleDeleteFile"));
            });
        });
    });

    describe("duplicateFileAndExtendWithPass", function () {
        it("should create a file with the _debug as addition", async function () {
            const fileContent = "Test\n";
            const testFile = await TestExecutionHelper.createTestFileWith("SampleTempFile", "py", fileContent);
            if (!testFile) {
                this.skip();
            }

            await FileHandler.duplicateFileAndExtendWithPass(testFile, fileContent);

            fs.readdir(path.join(TESTFILE_DIR, `/SampleTempFile/`), (err, fileNames: string[]) => {
                if (err) { throw err; }
                assert.ok(fileNames.includes("SampleTempFile_debug.py"));
            });
        });

        it("should add a pass at the end of the file", async function () {
            const fileContent = "Test\n";
            const testFile = await TestExecutionHelper.createTestFileWith("SampleTempFile", "py", fileContent);
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
            const testFile = await TestExecutionHelper.createTestFileWith("SampleTraceFile", "py", '');
            if (!testFile) {
                this.skip();
            }
            const backendTrace: BackendTrace = [];

            await FileHandler.createBackendTraceOutput(backendTrace, testFile);

            fs.readdir(path.join(TESTFILE_DIR, `/SampleTraceFile/`), (err, fileNames: string[]) => {
                if (err) { throw err; }
                assert.ok(fileNames.includes("backend_trace_SampleTraceFile.json"));
            });
        });
    });
});
