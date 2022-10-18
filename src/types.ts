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
type Primitive = string | number | boolean;
type StructuredObject = Var | Array<Fun> | Obj;

// ############################################################################################
// State Types for the Backend
type BackendTrace = Array<BackendTraceElem>;
type BackendTraceElem = {
    line: number,
    // Current Scope/Function/Frame in that the event happend
    scopeName: string,
    // Overview of all objects and functions in the global scope
    globals: Array<StructuredObject>,
    // In stack are functions and calls 
    stack: Array<StackElem>
    // In heap are value objects
    heap: Map<string, HeapElem>
};
// ############################################################################################

type Var = {
    name: string,
    value: Primitive,
};
type Fun = {
    name: string,
    type: string,
};
type Obj = {
    name: string,
    properties: Array<StructuredObject>,
};
// ############################################################################################
type StackElem = {
    funName: string,
    frameId: number,
    locals: Array<StructuredObject>,
};
// ############################################################################################
type HeapElem = {
    type: string,
    name: string,
    value: StructuredObject,
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
