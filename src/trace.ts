// Trace Datatypes
type Trace = Set<TraceElem>;
type TraceElem = VarAssign | FunCall | ReturnCall;
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