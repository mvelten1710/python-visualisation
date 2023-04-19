import * as assert from 'assert';
import { JsonMapper } from "../../backend/JsonMapper";
import { describe, it } from 'mocha';

suite('A JSONMapper when', () => {
    describe("getting validJsonFor Heap", function () {
        it("should return correct list json when a list is given", function () {
            const testValue = "[1, 2, 3]";
            const type: HeapType = 'list';

            const result = JsonMapper.validJsonFor(type, testValue);

            assert.equal(result, '["1", "2", "3"]');
        });

        it("should return correct tuple json when a tuple is given", function () {
            const testValue = "(1, None)";
            const type: HeapType = 'tuple';

            const result = JsonMapper.validJsonFor(type, testValue);

            assert.equal(result, '["1", "None"]');
        });

        it("should return correct set json when a set is given", function () {
            const testValue = "{1, 2, 3}";
            const type: HeapType = 'set';

            const result = JsonMapper.validJsonFor(type, testValue);

            assert.equal(result, '["1", "2", "3"]');
        });

        it("should return correct dict json when a dict is given", function () {
            const testValue = `{'one': 1,'two': 2,'three': 3}`;
            const type: HeapType = 'dict';

            const result = JsonMapper.validJsonFor(type, testValue);

            assert.equal(result, '{"one": "1","two": "2","three": "3"}');
        });
    });
});
