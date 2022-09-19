type Trace = {
    type: string,
    name: string,
    value: string | number | boolean | Trace[]
};

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