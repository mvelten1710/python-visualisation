import * as assert from 'assert';
import * as VariableMapper from "../../backend/VariableMapper";
import { describe, it } from 'mocha';

suite('A VariableMapper when', () => {
    describe("mapping a variable toValue", function () {
        it("should return correct int Value type when int is given", function () {
            const testVariable: Variable = {
                id: "",
                name: "",
                value: "1",
                type: "int",
                variablesReference: 0
            };

            const result = VariableMapper.toValue(testVariable);

            assert.equal(result.type, 'int');
            assert.equal(result.value, 1);
        });

        it("should return correct float Value type when float is given", function () {
            const testVariable: Variable = {
                id: "",
                name: "",
                value: "1",
                type: "float",
                variablesReference: 0
            };

            const result = VariableMapper.toValue(testVariable);

            assert.equal(result.type, 'float');
            assert.equal(result.value, 1);
        });

        it("should return correct NoneType Value type when None is given", function () {
            const testVariable: Variable = {
                id: "",
                name: "",
                value: "None",
                type: "NoneType",
                variablesReference: 0
            };

            const result = VariableMapper.toValue(testVariable);

            assert.equal(result.type, 'str');
            assert.equal(result.value, "None");
        });

        it("should return correct string Value type when string is given", function () {
            const testVariable: Variable = {
                id: "",
                name: "",
                value: "Im a string",
                type: "str",
                variablesReference: 0
            };

            const result = VariableMapper.toValue(testVariable);

            assert.equal(result.type, 'str');
            assert.equal(result.value, "Im a string");
        });

        it("should return correct bool Value type when bool is given", function () {
            const testVariable: Variable = {
                id: "",
                name: "",
                value: "true",
                type: "bool",
                variablesReference: 0
            };

            const result = VariableMapper.toValue(testVariable);

            assert.equal(result.type, 'bool');
            assert.equal(result.value, "true");
        });
    });
});
