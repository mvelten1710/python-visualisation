// Trace Datatypes
type EventTrace = Set<EventTraceElem>;
type EventTraceElem = VarAssign | FunCall | ReturnCall;
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

// State Type for the Backend
type StateTrace = Array<StateTraceElem>;
type StateTraceElem = {
    // Line of the executed code
    line: number,
    // Info for the frontend converter
    event: string,
    // Current Scope/Function/Frame
    scopeName: string,
    // All objects and functions in the global scope
    globals: Array<DVar | DFun>,
    // All object and functions in the local scope (probably in a function)
    locals: Array<DVar | DFun>,
};

type DVar = {
    name: string,
    value: string,
};

type DFun = {
    name: string,
    returnValue: string,
};

/**
 * 
 * 
 * 
 * "line": 1,
      "event": "step_line",
      "func_name": "<module>",
      "globals": {},
      "ordered_globals": [],
      "stack_to_render": [],
      "heap": {},
      "stdout": ""

 */

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