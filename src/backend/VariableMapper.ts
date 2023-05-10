import * as vscode from 'vscode';
import * as JsonMapper from "./JsonMapper";

export function toValue(variable: Variable): Value {
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

export async function toHeapValue(
    session: vscode.DebugSession,
    variable: Variable,
    variableContent: Variable[]
): Promise<[HeapValue, Array<RawHeapValue>]> {
    switch (variable.type) {
        case 'tuple':
            return createHeapValueForTuple(variableContent, variable);
        case 'list':
            return createHeapValueForList(variableContent, variable);
        case 'set':
            return createHeapValueForSet(variableContent, variable);
        case 'dict':
            return createHeapValueForDict(variableContent);
        case 'type':
            return await createHeapValueForType(variableContent, session);
        default:
            return createDefaultHeapValue(variable);
    }
}

export function createDefaultHeapValue(variable: Variable): [HeapValue, Array<RawHeapValue>] {
    return [
        {
            type: 'instance',
            value: variable.type,
        },
        new Array<RawHeapValue>(),
    ];
}

export function createHeapValueForTuple(variableContent: Variable[], variable: Variable): [HeapValue, Array<RawHeapValue>] {
    let rawHeapValues = new Array<RawHeapValue[]>();
    let alreadyUpdated = new Array<boolean[]>();

    const list = variableContent.map((elem) => {
        const depth = (elem.evaluateName.match(/\[/g) || []).length - 1;
        const indexes = elem.evaluateName.replace(/[\w]*/, '').replace(/[\[\]]*/g, '');
        const variableIsInBottomLayer = depth === 0;
        const parentIndex = variableIsInBottomLayer ? 0 : parseInt(indexes.slice(0, indexes.length - 1), 2);
        const ownIndex = parseInt(indexes, 2);

        return updateHeapList(elem, parentIndex, ownIndex, variableIsInBottomLayer, depth, rawHeapValues, alreadyUpdated);
    }).filter((variable) => variable !== undefined);

    return [
        {
            type: variable.type,
            value: list,
        },
        rawHeapValues.flat(),
    ] as [HeapValue, Array<RawHeapValue>];
}

export function createHeapValueForList(variableContent: Variable[], variable: Variable): [HeapValue, Array<RawHeapValue>] {
    let rawHeapValues = new Array<RawHeapValue[]>();
    let alreadyUpdated = new Array<boolean[]>();

    const list = variableContent.map((elem) => {
        const depth = (elem.evaluateName.match(/\[/g) || []).length - 1;
        const indexes = elem.evaluateName.replace(/[\w]*/, '').replace(/[\[\]]*/g, '');
        const variableIsInBottomLayer = depth === 0;
        const parentIndex = Number(indexes.charAt(variableIsInBottomLayer ? 0 : depth - 1));
        const ownIndex = Number(indexes.charAt(indexes.length - 1));

        return updateHeapList(elem, parentIndex, ownIndex, variableIsInBottomLayer, depth, rawHeapValues, alreadyUpdated);
    }).filter((variable) => variable !== undefined);

    return [
        {
            type: variable.type,
            value: list,
        },
        rawHeapValues.flat(),
    ] as [HeapValue, Array<RawHeapValue>];
}

function updateHeapList(elem: Variable, parentIndex: number, ownIndex: number, variableIsInBottomLayer: boolean, depth: number, rawHeapValues: RawHeapValue[][], alreadyUpdated: boolean[][]): Value | undefined {
    const heapElem = toValue(elem);
    const hasReference = elem.variablesReference > 0;

    if (variableIsInBottomLayer && hasReference) {
        updateTrackingLists(depth, rawHeapValues, alreadyUpdated);
        rawHeapValues[depth][ownIndex] = emptyRawHeapValueOf(elem);
    } else if (!variableIsInBottomLayer) {
        updateTrackingLists(depth, rawHeapValues, alreadyUpdated);
        if (hasReference) {
            rawHeapValues[depth][ownIndex] = emptyRawHeapValueOf(elem);
        }
        updateRawHeapValue(depth, parentIndex, heapElem, rawHeapValues, alreadyUpdated);
    }

    return variableIsInBottomLayer ? heapElem : undefined;
}

function updateTrackingLists(depth: number, rawHeapValues: RawHeapValue[][], alreadyUpdated: boolean[][]) {
    if (rawHeapValues[depth] === undefined) {
        rawHeapValues[depth] = new Array<RawHeapValue>();
        alreadyUpdated[depth] = new Array<boolean>();
    }
}

function emptyRawHeapValueOf(variable: Variable): RawHeapValue {
    return {
        ref: variable.variablesReference,
        type: variable.type as HeapType,
        value: new Array<Value>(),
    };
}

function updateRawHeapValue(depth: number, parentIndex: number, heapElem: Value, rawHeapValues: RawHeapValue[][], alreadyUpdated: boolean[][]) {
    if (alreadyUpdated[depth - 1][parentIndex]) {
        const heapVValue = rawHeapValues[depth - 1][parentIndex].value;
        (heapVValue as Array<Value>).push(heapElem);
        rawHeapValues[depth - 1][parentIndex].value = heapVValue;
    } else {
        rawHeapValues[depth - 1][parentIndex].value = Array.of(heapElem);
        alreadyUpdated[depth - 1][parentIndex] = true;
    }
}

export function createHeapValueForSet(variableContent: Variable[], variable: Variable): [HeapValue, Array<RawHeapValue>] {
    let rawHeapValues = new Array<RawHeapValue>();
    const list = variableContent.map((elem) => {
        const hasReference = elem.variablesReference > 0;
        const heapElem = toValue(elem);
        if (hasReference) {
            rawHeapValues.push(rawToHeapValue(elem.variablesReference, elem.type as HeapType, elem.value));
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

export function createHeapValueForDict(variableContent: Variable[]): [HeapValue, Array<RawHeapValue>] {
    let rawHeapValues = new Array<RawHeapValue>();
    const dict = variableContent.reduce((acc, elem) => {
        const hasReference = elem.variablesReference > 0;
        const value = toValue(elem);
        if (hasReference) {
            rawHeapValues.push(rawToHeapValue(elem.variablesReference, elem.type as HeapType, elem.value));
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

export async function createHeapValueForType(variableContent: Variable[], session: vscode.DebugSession): Promise<[HeapValue, Array<RawHeapValue>]> {
    let rawHeapValues = new Array<RawHeapValue>();
    const temp = await variablesRequest(session, variableContent[0].variablesReference);
    const classProperties = temp.reduce((acc, elem) => {
        const hasReference = elem.variablesReference > 0;
        const value = toValue(elem);
        if (hasReference) {
            rawHeapValues.push(rawToHeapValue(elem.variablesReference, elem.type as HeapType, elem.value));
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

export async function variablesRequest(session: vscode.DebugSession, id: number): Promise<Array<Variable>> {
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

export function rawToHeapValue(address: Address, type: HeapType, value: string): RawHeapValue {
    return {
        ref: address,
        type: type,
        value: stringToObject(type, value), // FIXME hier rekurssivität
    };
}

export function stringToObject(type: HeapType, value: string): HeapV {
    if (value.includes("...")) {
        return Array.of({ type: 'str', value: JSON.stringify(value) });
    }
    const temp = JSON.parse(JsonMapper.validJsonFor(type, value));
    switch (type) {
        case 'list':
        case 'tuple':
        case 'set':
            return (temp as Array<string>).map((val) => {
                return { type: 'str', value: val };
            }); // FIXME macht auß den values aus 1 neue strings, nicht aus den übrigen values
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
