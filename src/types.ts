// Event Types for the Frontend
type FrontendTrace = Array<FrontendTraceElem>;
type FrontendTraceElem = VarAssign | FunCall | ReturnCall;
type VarAssign = {
    kind: 'varAssign',
    varId: string,
    varName: string,
    value: Value
};
type FunCall = {
    kind: 'funCall'
    funName: string,
    args: Array<Value>
};
type ReturnCall = {
    kind: 'returnCall'
    value: Value
};
type Value = string | number | boolean;

// State Types for the Backend
type BackendTrace = Array<BackendTraceElem>;
type BackendTraceElem = {
    //line: number,
    //event: string,
    // Current Scope/Function/Frame in that the event happend
    scopeName: string,
    // Overview of all objects and functions in the global scope
    globals: Array<Var | Func | Structured>,
    // Overview of all object and functions in the local scope (probably in a function)
    locals: Array<Var | Func | Structured>,
};

type Var = {
    name: string,
    value: Value | Var,
};

type Func = {
    name: string,
    // Vars are the parameters of a function
    params: Array<Var>,
    returnValue: string
};

type Structured = {
    name: string,
    vars: Array<Var>,
};

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
    variablesReference: number | Variable[],
};
