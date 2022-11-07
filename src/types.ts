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
    kind: 'returnCall',
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
    stack: Array<StackElem>,
    // In heap are value objects
    heap: Map<Address, HeapValue>
};

type Primitive = string | number | boolean;

type Address = number;

type Value = { type: 'int', value: number } 
           | { type: 'float', value: number }
           | { type: 'str', value: string }
           | { type: 'bool', value: string }
           | { type: 'ref', value: Address };

type StackElem = {
    funName: string,
    frameId: number,
    locals: Map<string, Value>,
};

type HeapValue = { type: 'list', value: Array<Value> }
               | { type: 'tuple', value: Array<Value> }
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

type Capabilities =  {
    /**
     * The debug adapter supports the `configurationDone` request.
     */
    supportsConfigurationDoneRequest?: boolean;
  
    /**
     * The debug adapter supports function breakpoints.
     */
    supportsFunctionBreakpoints?: boolean;
  
    /**
     * The debug adapter supports conditional breakpoints.
     */
    supportsConditionalBreakpoints?: boolean;
  
    /**
     * The debug adapter supports breakpoints that break execution after a
     * specified number of hits.
     */
    supportsHitConditionalBreakpoints?: boolean;
  
    /**
     * The debug adapter supports a (side effect free) `evaluate` request for data
     * hovers.
     */
    supportsEvaluateForHovers?: boolean;
  
    /**
     * The debug adapter supports stepping back via the `stepBack` and
     * `reverseContinue` requests.
     */
    supportsStepBack?: boolean;
  
    /**
     * The debug adapter supports setting a variable to a value.
     */
    supportsSetVariable?: boolean;
  
    /**
     * The debug adapter supports restarting a frame.
     */
    supportsRestartFrame?: boolean;
  
    /**
     * The debug adapter supports the `gotoTargets` request.
     */
    supportsGotoTargetsRequest?: boolean;
  
    /**
     * The debug adapter supports the `stepInTargets` request.
     */
    supportsStepInTargetsRequest?: boolean;
  
    /**
     * The debug adapter supports the `completions` request.
     */
    supportsCompletionsRequest?: boolean;
  
    /**
     * The set of characters that should trigger completion in a REPL. If not
     * specified, the UI should assume the `.` character.
     */
    completionTriggerCharacters?: string[];
  
    /**
     * The debug adapter supports the `modules` request.
     */
    supportsModulesRequest?: boolean;
  
    /**
     * The debug adapter supports the `restart` request. In this case a client
     * should not implement `restart` by terminating and relaunching the adapter
     * but by calling the `restart` request.
     */
    supportsRestartRequest?: boolean;
  
    /**
     * The debug adapter supports `exceptionOptions` on the
     * `setExceptionBreakpoints` request.
     */
    supportsExceptionOptions?: boolean;
  
    /**
     * The debug adapter supports a `format` attribute on the `stackTrace`,
     * `variables`, and `evaluate` requests.
     */
    supportsValueFormattingOptions?: boolean;
  
    /**
     * The debug adapter supports the `exceptionInfo` request.
     */
    supportsExceptionInfoRequest?: boolean;
  
    /**
     * The debug adapter supports the `terminateDebuggee` attribute on the
     * `disconnect` request.
     */
    supportTerminateDebuggee?: boolean;
  
    /**
     * The debug adapter supports the `suspendDebuggee` attribute on the
     * `disconnect` request.
     */
    supportSuspendDebuggee?: boolean;
  
    /**
     * The debug adapter supports the delayed loading of parts of the stack, which
     * requires that both the `startFrame` and `levels` arguments and the
     * `totalFrames` result of the `stackTrace` request are supported.
     */
    supportsDelayedStackTraceLoading?: boolean;
  
    /**
     * The debug adapter supports the `loadedSources` request.
     */
    supportsLoadedSourcesRequest?: boolean;
  
    /**
     * The debug adapter supports log points by interpreting the `logMessage`
     * attribute of the `SourceBreakpoint`.
     */
    supportsLogPoints?: boolean;
  
    /**
     * The debug adapter supports the `terminateThreads` request.
     */
    supportsTerminateThreadsRequest?: boolean;
  
    /**
     * The debug adapter supports the `setExpression` request.
     */
    supportsSetExpression?: boolean;
  
    /**
     * The debug adapter supports the `terminate` request.
     */
    supportsTerminateRequest?: boolean;
  
    /**
     * The debug adapter supports data breakpoints.
     */
    supportsDataBreakpoints?: boolean;
  
    /**
     * The debug adapter supports the `readMemory` request.
     */
    supportsReadMemoryRequest?: boolean;
  
    /**
     * The debug adapter supports the `writeMemory` request.
     */
    supportsWriteMemoryRequest?: boolean;
  
    /**
     * The debug adapter supports the `disassemble` request.
     */
    supportsDisassembleRequest?: boolean;
  
    /**
     * The debug adapter supports the `cancel` request.
     */
    supportsCancelRequest?: boolean;
  
    /**
     * The debug adapter supports the `breakpointLocations` request.
     */
    supportsBreakpointLocationsRequest?: boolean;
  
    /**
     * The debug adapter supports the `clipboard` context value in the `evaluate`
     * request.
     */
    supportsClipboardContext?: boolean;
  
    /**
     * The debug adapter supports stepping granularities (argument `granularity`)
     * for the stepping requests.
     */
    supportsSteppingGranularity?: boolean;
  
    /**
     * The debug adapter supports adding breakpoints based on instruction
     * references.
     */
    supportsInstructionBreakpoints?: boolean;
  
    /**
     * The debug adapter supports `filterOptions` as an argument on the
     * `setExceptionBreakpoints` request.
     */
    supportsExceptionFilterOptions?: boolean;
  
    /**
     * The debug adapter supports the `singleThread` property on the execution
     * requests (`continue`, `next`, `stepIn`, `stepOut`, `reverseContinue`,
     * `stepBack`).
     */
    supportsSingleThreadExecutionRequests?: boolean;
  };
