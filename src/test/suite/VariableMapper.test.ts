import * as assert from 'assert';
import * as VariableMapper from "../../backend/VariableMapper";
import { describe, it } from 'mocha';

suite('A VariableMapper when', () => {
    describe("mapping a variable toValue", () => {
        const variables = [
            ['byte', 1],
            ['short', 12],
            ['int', 122],
            ['long', 1233232323],
            ['float', 123145.982],
            ['double', 11123.223],
            ['number', 1.9217398],
            ['char', 'c'],
            ['str', "HelloWorld!"],
            ['bool', "true"]
        ];
        variables.forEach(([type, value]) => {
            it(`should return correct ${type} Value type when ${type} is given`, () => {
                const testVariable: Variable = {
                    evaluateName: "",
                    name: "",
                    value: `${value}`,
                    type: `${type}`,
                    variablesReference: 0
                };

                const result = VariableMapper.toValue(testVariable);

                assert.deepEqual(result, { type: type, value: value });
            });
        });

        it("should return a none when NoneType is given", () => {
            const testVariable: Variable = {
                evaluateName: "",
                name: "",
                value: "",
                type: 'NoneType',
                variablesReference: 0
            };

            const result = VariableMapper.toValue(testVariable);

            assert.deepEqual(result, { type: 'none', value: 'None' });
        });

        it("should return a bool when boolean is given", () => {
            const testVariable: Variable = {
                evaluateName: "",
                name: "",
                value: "true",
                type: 'boolean',
                variablesReference: 0
            };

            const result = VariableMapper.toValue(testVariable);

            assert.deepEqual(result, { type: 'bool', value: 'true' });
        });

        it("should return a ref when non primitive is given", () => {
            const testVariable: Variable = {
                evaluateName: "",
                name: "",
                value: "",
                type: 'NonPrimitive',
                variablesReference: 7
            };

            const result = VariableMapper.toValue(testVariable);

            assert.deepEqual(result, { type: 'ref', value: 7 });
        });
    });
});
