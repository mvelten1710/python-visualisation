import * as vscode from 'vscode';
import { JsonMapper } from './JsonMapper';

export class VariableMapper {
    public static toValue(variable: Variable): Value {
        switch (variable.type) {
            case 'int':
                return {
                    type: 'int',
                    value: parseInt(variable.value),
                };
            case 'float':
                return {
                    type: 'float',
                    value: parseFloat(variable.value),
                };
            case 'NoneType':
            case 'str':
                return {
                    type: 'str',
                    value: variable.value,
                };
            case 'bool':
                return {
                    type: 'bool',
                    value: variable.value,
                };
            default:
                return {
                    type: 'ref',
                    value: variable.variablesReference,
                };
        }
    }

    public static async toHeapValue(
        session: vscode.DebugSession,
        variable: Variable,
        variableContent: Variable[]
    ): Promise<[HeapValue, Array<RawHeapValue>]> {
        let rawHeapValues = new Array<RawHeapValue>();
        switch (variable.type) {
            case 'list':
            case 'tuple':
            case 'set':
                return this.createHeapValueForSet(variableContent, rawHeapValues, variable);
            case 'dict':
                return this.createHeapValueForDict(variableContent, rawHeapValues);
            case 'type':
                return await this.createHeapValueForType(variableContent, rawHeapValues, session);
            default:
                return this.createDefaultHeapValue(rawHeapValues, variable);
        }
    }

    private static createDefaultHeapValue(rawHeapValues: Array<RawHeapValue>, variable: Variable): [HeapValue, Array<RawHeapValue>] {
        return [
            {
                type: 'instance',
                value: variable.type,
            },
            rawHeapValues,
        ];
    }

    private static createHeapValueForSet(variableContent: Variable[], rawHeapValues: Array<RawHeapValue>, variable: Variable): [HeapValue, Array<RawHeapValue>] {
        const list = variableContent.map((elem) => {
            const hasReference = elem.variablesReference > 0;
            const heapElem = VariableMapper.toValue(elem);
            if (hasReference) {
                rawHeapValues.push(this.rawToHeapValue(elem.variablesReference, elem.type as HeapType, elem.value));
            }
            return heapElem;
        });
        return [
            {
                type: variable.type,
                value: list,
            },
            rawHeapValues,
        ] as [HeapValue, Array<RawHeapValue>];
    }

    private static createHeapValueForDict(variableContent: Variable[], rawHeapValues: Array<RawHeapValue>): [HeapValue, Array<RawHeapValue>] {
        const dict = variableContent.reduce((acc, elem) => {
            const hasReference = elem.variablesReference > 0;
            const value = VariableMapper.toValue(elem);
            if (hasReference) {
                rawHeapValues.push(this.rawToHeapValue(elem.variablesReference, elem.type as HeapType, elem.value));
            }
            return acc.set(elem.name, value);
        }, new Map<any, Value>());
        return [
            {
                type: 'dict',
                value: dict,
            },
            rawHeapValues,
        ];
    }

    private static async createHeapValueForType(variableContent: Variable[], rawHeapValues: Array<RawHeapValue>, session: vscode.DebugSession): Promise<[HeapValue, Array<RawHeapValue>]> {
        const temp = await this.variablesRequest(session, variableContent[0].variablesReference);
        const classProperties = temp.reduce((acc, elem) => {
            const hasReference = elem.variablesReference > 0;
            const value = VariableMapper.toValue(elem);
            if (hasReference) {
                rawHeapValues.push(this.rawToHeapValue(elem.variablesReference, elem.type as HeapType, elem.value));
            }
            return acc.set(elem.name, value);
        }, new Map<string, Value>());
        return [
            {
                type: 'class',
                value: {
                    className: variableContent[0].name,
                    properties: classProperties,
                },
            },
            rawHeapValues,
        ] as [HeapValue, Array<RawHeapValue>];
    }

    private static async variablesRequest(session: vscode.DebugSession, id: number): Promise<Array<Variable>> {
        return (
            (
                await session.customRequest('variables', {
                    variablesReference: id,
                })
            ).variables as Array<Variable>
        ).filter(
            (variable) =>
                variable.name !== 'special variables' && variable.name !== 'function variables' && variable.name !== 'len()'
        );
    }

    private static rawToHeapValue(address: Address, type: HeapType, value: string): RawHeapValue {
        return {
            ref: address,
            type: type,
            value: this.stringToObject(type, value),
        };
    }

    private static stringToObject(type: HeapType, value: string): HeapV {
        const temp = JSON.parse(JsonMapper.validJsonFor(type, value));
        switch (type) {
            case 'list':
            case 'tuple':
            case 'set':
                return (temp as Array<string>).map((val) => {
                    return { type: 'str', value: val };
                });
            case 'dict':
                const keys = Array.from(Object.keys(temp.value));
                const values = Array.from(Object.values(temp.value)) as Array<any>;
                return keys.reduce((acc, cv, index) => {
                    return acc.set(cv, { type: 'str', value: values[index] });
                }, new Map<any, Value>());
            case 'class':
                return { className: '', properties: new Map<string, Value>() };
        }
    }
}