import { DebugSession } from "vscode";
import { scopesRequest, variablesRequest, createStackElemFrom, BasicTypes } from "../BackendSession";
import * as VariableMapper from "../VariableMapper";

enum NumberClasses { 'Number', 'Byte', 'Short', 'Integer', 'Long', 'Float', 'Double', 'BigDecimal' }

export async function createJavaStackAndHeap(
    session: DebugSession,
    stackFrames: Array<StackFrame>
): Promise<[Array<StackElem>, Map<Address, HeapValue>, boolean, boolean]> {
    let stack = Array<StackElem>();
    let heap = new Map<Address, HeapValue>();
    let isNextRequest: boolean = true;

    if (stackFrames.filter(frame => frame.name.includes('.main(')).length <= 0) {
        return [stack, heap, false, true];
    }

    for (const stackFrame of stackFrames) {
        const scopes = await scopesRequest(session, stackFrame.id);
        const [locals, globals] = [scopes[0], scopes[1]];
        const localsVariables = await variablesRequest(session, locals.variablesReference);

        if (localsVariables.length > 1 && (!Object.values(BasicTypes).includes(localsVariables.at(-1)!.type.split('[')[0]) && !Object.values(NumberClasses).includes(localsVariables.at(-1)!.type.split('[')[0]) && !Object.values(["String", "StringBuffer", "StringBuilder", "LinkedList", "ArrayList", "Character", "Boolean", "HashMap", "HashSet"]).includes(localsVariables.at(-1)!.type.split('[')[0]))) {
            isNextRequest = false; // TODO remember old and compare to new to determine if necessary 
        }

        const primitiveVariables = localsVariables.filter((variable) =>
            variable.variablesReference === 0
        );

        const heapVariables = localsVariables.filter(
            (variable) =>
                variable.variablesReference > 0
        );

        const allVariables = [...primitiveVariables, ...heapVariables];

        stack.push(createStackElemFrom(stackFrame, allVariables));

        let heapVars = new Map<Address, HeapValue>();

        heap = heapVariables.length > 0
            ? new Map<Address, HeapValue>([...heap, ...(await getHeapOf(heapVariables, heap, heapVars, session))])
            : heap;

        heapVars.forEach((value, key) => {
            if (!heap.has(key)) {
                heap.set(key, value);
            }
        });
    }
    return [stack, heap, isNextRequest, false];
}

async function getHeapOf(variables: Variable[], heap: Map<number, HeapValue>, heapVars: Map<number, HeapValue>, session: DebugSession): Promise<Map<Address, HeapValue>> {
    return await variables
        .filter((v) => v.variablesReference > 0)
        .reduce(async (acc, variable) => {
            if (!variable) { return acc; }
            const result = await createHeapVariable(variable, session);
            if (!result) { return acc; }
            heapVars = result[1].reduce((acc, variable) => {
                return acc.set(variable.ref, { type: variable.type, name: variable.name, value: variable.value } as HeapValue);
            }, heapVars);
            return (await acc).set(variable.variablesReference, result[0]);
        }, Promise.resolve(heap));
}

async function createHeapVariable(variable: Variable, session: DebugSession, referenceMap: Map<number, Variable[]> = new Map()) {
    let rawHeapValues = new Array<RawHeapValue>();
    let list = new Array<Value>();

    if (variable.type === 'String') {
        return createStringHeapValue(variable);
    }

    let listForDepth = await variablesRequest(session, variable.variablesReference);
    referenceMap.set(variable.variablesReference, listForDepth);

    do {
        const [actualVariable, ...remainingVariables] = listForDepth;
        listForDepth = remainingVariables;

        if (!actualVariable) {
            continue;
        }

        if (actualVariable.type === 'String') {
            const [variableRefValue, rawHeapValue] = createStackedStringHeapValue(actualVariable);
            rawHeapValues.push(rawHeapValue);
            (list as Array<Value>).push(variableRefValue);
            continue;
        }

        if (isSpecialCase(variable, actualVariable)) {
            const variableValue: Value = VariableMapper.toValue({
                type: getTypeOf(actualVariable),
                value: actualVariable.value.split("\"")[1]
            } as Variable);
            (list as Array<Value>).push(variableValue);
            continue;
        }

        const variablesReference = actualVariable.variablesReference;

        if (variablesReference) { // TODO Variablen auflösung über das @ im namen
            const elem = await createInnerHeapVariable(actualVariable, session, referenceMap);
            rawHeapValues = rawHeapValues.concat(elem);
        }

        (list as Array<Value>).push(VariableMapper.toValue(actualVariable));
    } while (listForDepth.length > 0);

    const heapValue = {
        type: isWrapper(variable) ? 'wrapper' : variable.type,
        name: variable.type,
        value: list,
    };

    return [
        heapValue,
        rawHeapValues,
    ] as [HeapValue, Array<RawHeapValue>];
}

function createStringHeapValue(variable: Variable): [HeapValue, Array<RawHeapValue>] {
    const variableValue: Value = VariableMapper.toValue({ type: 'str', value: variable.value.split("\"")[1] } as Variable);
    return [
        {
            type: 'wrapper',
            name: variable.type,
            value: variableValue,
        }, Array.of()
    ] as [HeapValue, Array<RawHeapValue>];
}

function createStackedStringHeapValue(variable: Variable): [Value, RawHeapValue] {
    const variableRefValue: Value = VariableMapper.toValue({
        type: 'ref',
        variablesReference: variable.variablesReference
    } as Variable);
    const rawHeapValue: RawHeapValue = {
        ref: variable.variablesReference,
        type: 'wrapper',
        name: variable.type,
        value: Array.of(VariableMapper.toValue({
            type: 'str',
            value: variable.value.split("\"")[1]
        } as Variable))
    } as RawHeapValue;
    return [variableRefValue, rawHeapValue];
}

async function createInnerHeapVariable(variable: Variable, session: DebugSession, referenceMap: Map<number, Variable[]>, visitedSet: Set<number> = new Set<number>): Promise<RawHeapValue[]> {
    let rawHeapValues = new Array<RawHeapValue>();
    let heapValue: HeapV | undefined = undefined;
    let listForDepth: Variable[];
    if (referenceMap.has(variable.variablesReference)) {
        listForDepth = referenceMap.get(variable.variablesReference)!;
    } else {
        listForDepth = await variablesRequest(session, variable.variablesReference);
        referenceMap.set(variable.variablesReference, listForDepth);
    }

    do {
        const [actualVariable, ...remainingVariables] = listForDepth;
        listForDepth = remainingVariables;
        const variablesReference = actualVariable.variablesReference;

        if (!visitedSet.has(variablesReference)) {
            visitedSet.add(actualVariable.variablesReference);

            if (actualVariable.type === 'String') {
                const [variableRefValue, rawHeapValue] = createStackedStringHeapValue(actualVariable);
                rawHeapValues.push(rawHeapValue);
                heapValue = heapValue
                    ? (heapValue as Array<Value>).concat(variableRefValue)
                    : Array.of(variableRefValue);
                continue;
            }

            if (isSpecialCase(variable, actualVariable)) {
                const variableValue: Value = VariableMapper.toValue({
                    type: getTypeOf(actualVariable),
                    value: actualVariable.value.split("\"")[1]
                } as Variable);
                heapValue = heapValue
                    ? (heapValue as Array<Value>).concat(variableValue)
                    : Array.of(variableValue);
                continue;
            }

            const variablesReference = actualVariable.variablesReference;
            if (variablesReference) {
                const elem = await createInnerHeapVariable(actualVariable, session, referenceMap, visitedSet);
                rawHeapValues = rawHeapValues.concat(elem);
            }
        }

        heapValue = getUpdateForHeapV(variable, actualVariable, heapValue, VariableMapper.toValue(actualVariable));
    } while (listForDepth.length > 0);

    return rawHeapValues.concat({
        ref: variable.variablesReference,
        type: isWrapper(variable) ? 'wrapper' : variable.type,
        name: variable.type,
        value: heapValue
    } as RawHeapValue);
}

function isSpecialCase(variable: Variable, actualVariable: Variable): boolean {
    return actualVariable.value.includes("StringBuffer") ||
        actualVariable.value.includes("StringBuilder") ||
        actualVariable.value.includes("Character")
        ||
        actualVariable.value.includes("Boolean")
        ||
        Object.values(NumberClasses).includes(variable.value.split("@")[0])
        ;
}

function getTypeOf(variable: Variable): string {
    if (variable.value.includes("StringBuffer") || variable.value.includes("StringBuilder") || variable.value.includes("Character")) {
        return 'str';
    }
    else if (variable.value.includes("Boolean")) {
        return 'boolean';
    }
    else {
        return 'number';
    }
}

function isWrapper(variable: Variable): boolean {
    return [...Object.values(NumberClasses), ...["StringBuffer", "StringBuilder", "Boolean", "Character"]].includes(variable.value.split("@")[0]);
}

function getUpdateForHeapV(variable: Variable, actualVariable: Variable, actualHeapV: HeapV | undefined, value: Value): HeapV {
    switch (variable.type) {
        case 'class': // TODO check appearence
            return { className: '', properties: new Map<string, Value>() };
        case 'instance': // TODO check
            return actualHeapV
                ? (actualHeapV as Map<string, Value>).set(actualVariable.name, value)
                : new Map<string, Value>().set(actualVariable.name, value);
        default:
            if (variable.type.includes("[]")) { // int[], float[], int[][]
                return actualHeapV
                    ? (actualHeapV as Array<Value>).concat(value)
                    : Array.of(value);
            }

            return Array.of(value);
    }
}
