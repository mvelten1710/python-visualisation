import { DebugSession } from "vscode";
import { scopesRequest, variablesRequest, createStackElemFrom } from "../BackendSession";
import * as VariableMapper from "../VariableMapper";

export async function createJavaStackAndHeap(
    session: DebugSession,
    stackFrames: Array<StackFrame>
): Promise<[Array<StackElem>, Map<Address, HeapValue>, boolean]> {
    let stack = Array<StackElem>();
    let heap = new Map<Address, HeapValue>();

    if (!stackFrames[0].name.includes('.main(')) {
        return [stack, heap, true];
    }

    for (let i = 0; i < stackFrames.length; i++) {
        const scopes = await scopesRequest(session, stackFrames[i].id);
        const [locals, globals] = [scopes[0], scopes[1]];
        const localsVariables = await variablesRequest(session, locals.variablesReference);


        const primitiveVariables = localsVariables.filter((variable) =>
            variable.variablesReference === 0 || variable.type === 'String'
        );

        const heapVariablesWithoutSpecial = localsVariables.filter(
            (variable) =>
                variable.variablesReference > 0 && // FIXME important in java?
                variable.name !== 'class variables' &&
                variable.name !== 'function variables' &&
                variable.type !== 'String'
        );

        const specialVariables = (
            await Promise.all(
                localsVariables
                    .filter(
                        (variable) =>
                            variable.variablesReference > 0 &&
                            (variable.name === 'class variables' || variable.name === 'function variables')
                    ).map(async (variable) => {
                        return await variablesRequest(session, variable.variablesReference);
                    })
            )
        ).flat();

        const heapVariables = [...heapVariablesWithoutSpecial, ...specialVariables];
        const allVariables = [...primitiveVariables, ...heapVariables];

        stack.push(createStackElemFrom(stackFrames[i], allVariables));

        const isLastFrame = i === stackFrames.length - 1;
        if (isLastFrame) {
            // TODO better styling and getting already full heap back
            let heapVars = new Map<Address, HeapValue>();

            heap = await getHeapOf(heapVariables, heap, heapVars, session);

            heapVars.forEach((value, key) => {
                if (!heap.has(key)) {
                    heap.set(key, value);
                }
            });
        }
    }
    return [stack, heap, false];
}

async function getHeapOf(variables: Variable[], heap: Map<number, HeapValue>, heapVars: Map<number, HeapValue>, session: DebugSession): Promise<Map<number, HeapValue>> {
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
    let listForDepth = await variablesRequest(session, variable.variablesReference);
    referenceMap.set(variable.variablesReference, listForDepth);

    do {
        const [actualVariable, ...remainingVariables] = listForDepth;
        listForDepth = remainingVariables;

        if (!actualVariable) {
            continue;
        }
        const isStringBufferBuilder = actualVariable.value.includes("StringBuffer") || actualVariable.value.includes("StringBuilder");
        const variablesReference = actualVariable.variablesReference;

        if (variablesReference && !(variable.type === 'String[]' || variable.type === 'String') && !isStringBufferBuilder) { // TODO Variablen auflösung über das @ im namen
            const elem = await createInnerHeapVariable(actualVariable, session, referenceMap);
            rawHeapValues = rawHeapValues.concat(elem);
        }

        const variableToMap =
            isStringBufferBuilder
                ? { type: 'String', value: actualVariable.value.split("\"")[1] } as Variable
                : actualVariable;
        list.push(VariableMapper.toValue(variableToMap));
    } while (listForDepth.length > 0);

    const heapValue = {
        type: variable.type,
        value: list,
    };

    return [
        heapValue,
        rawHeapValues,
    ] as [HeapValue, Array<RawHeapValue>];
}

async function createInnerHeapVariable(variable: Variable, session: DebugSession, referenceMap: Map<number, Variable[]>, visitedSet: Set<number> = new Set<number>): Promise<RawHeapValue[]> {
    let rawHeapValues = new Array<RawHeapValue>();
    let heapValue: HeapV | undefined = undefined;
    let listForDepth: Variable[];
    let nameOfInstance: string | undefined;
    if (referenceMap.has(variable.variablesReference)) {
        listForDepth = referenceMap.get(variable.variablesReference)!;
    } else {
        listForDepth = await variablesRequest(session, variable.variablesReference);
        referenceMap.set(variable.variablesReference, listForDepth);
    }

    do {
        const [actualVariable, ...remainingVariables] = listForDepth;
        const variablesReference = actualVariable.variablesReference;
        if (!visitedSet.has(variablesReference)) {
            visitedSet.add(actualVariable.variablesReference);

            if (variablesReference && !(variable.type === 'String[]' || variable.type === 'String')) {
                const elem = await createInnerHeapVariable(actualVariable, session, referenceMap, visitedSet);
                rawHeapValues = rawHeapValues.concat(elem);
            }
        }

        heapValue = getUpdateForHeapV(variable, actualVariable, heapValue, VariableMapper.toValue(actualVariable));

        listForDepth = remainingVariables;
    } while (listForDepth.length > 0);

    return rawHeapValues.concat({
        ref: variable.variablesReference,
        type: variable.type,
        name: nameOfInstance,
        value: heapValue
    } as RawHeapValue);
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