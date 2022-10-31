// Event Types for the Frontend
type FrontendTrace = Array<FrontendTraceElem>;
type FrontendTraceElem = VarAssign | FunCall | ReturnCall;
type VarAssign = {
    kind: 'varAssign',
    varId: string,
    varName: string,
    value: Primitive
};
type FunCall = {
    kind: 'funCall'
    funName: string,
    args: Array<Primitive>
};
type ReturnCall = {
    kind: 'returnCall'
    value: Primitive
};

// ############################################################################################
// State Types for the Backend
type BackendTrace = Array<BackendTraceElem>;
type BackendTraceElem = {
    line: number,
    // Current Scope/Function/Frame in that the event happend
    scopeName: string,
    // Overview of all objects and functions in the global scope
    globals: Map<string, Value>,
    // In stack are functions and calls 
    stack: Array<StackElem>
    // In heap are value objects
    heap: Map<Address, HeapValue>
};

type Primitive = string | number | boolean;

type Address = number;

type Value = { type: 'int', value: number } 
           | { type: 'float', value: number }
           | { type: 'ref', value: Address };

type StackElem = {
    funName: string,
    frameId: number,
    locals: Map<string, Value>,
};

type HeapValue = { type: 'list', value: Array<Value> }
               | { type: 'tuple', value: Array<Value> }
               | { type: 'string', value: string }
               | { type: 'dict', value: Map<any, Value> }
               | { type: 'object', value: ObjectValue };

type ObjectValue = { 
    typeName: string,
    properties: Map<string, Value>
 };
// ############################################################################################
// Debug Adapter Datatypes
type Thread = { id: number, name: string };
type StackFrame = {
    column: number, 
    id: number, 
    line: number, 
    name: string 
};
type Scope = {
    name: string,
    variablesReference: number,
};
type Variable = {
    id: string,
    name: string,
    value:string,
    type: string,
    variablesReference: number,
};
