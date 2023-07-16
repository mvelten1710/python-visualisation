/**
 * Supported Languages for the Extension
 */
type SupportedLanguages = 'python' | 'java';

/**
 * Supported steps for debugger
 */
type DebuggerStep = 'stepIn' | 'stepOut' | 'continue' | 'next';

/** 
 * For better readable code
*/
type Try = Success | Failure;
type Success = { result: any };
type Failure = { errorMessage: string };

// State Types for the Frontend
type FrontendTrace = Array<FrontendTraceElem>;
type FrontendTraceElem = [number, string, string];
// ############################################################################################
// State Types for the Backend
type BackendTrace = Array<BackendTraceElem>;
type BackendTraceElem = {
  line: number;
  stack: Array<StackElem>;
  heap: Map<Address, HeapValue>;
};

type Primitive = number | string | boolean;

type Address = number;

type HeapType = 'list' | 'tuple' | 'set' | 'dict' | 'class' | 'wrapper';
// java: 'String[]' type
type HeapV = Array<Value> | Map<any, Value> | ClassValue | Array<[Value, Value]>;

type RawHeapValue = {
  ref: Address;
  type: HeapType;
  name: string,
  value: HeapV;
};

type Value =
  /* all languages */
  | { type: 'int'; value: number }
  | { type: 'float'; value: number }
  | { type: 'str'; value: string }
  | { type: 'none'; value: string }
  | { type: 'bool'; value: string }
  | { type: 'ref'; value: Address }
  /* Java addition */
  | { type: 'byte'; value: number }
  | { type: 'short'; value: number }
  | { type: 'long'; value: number }
  | { type: 'double'; value: number }
  | { type: 'number'; value: number }
  | { type: 'char'; value: string };


type StackElem = {
  frameName: string;
  locals: Map<string, Value>;
};

type HeapValue =
  | { type: 'list'; value: Array<Value> }
  | { type: 'tuple'; value: Array<Value> }
  | { type: 'set'; value: Array<Value> }
  | { type: 'dict'; value: Map<any, Value> }
  | { type: 'map'; mapType: string, value: Array<[Value, Value]> }
  | { type: 'class'; value: ClassValue }
  | { type: 'instance'; name: string, value: Map<string, Value> }
  | { type: 'wrapper'; name: string; value: Value | Array<Value> };
// wrapper type -> frontend list elements dodge

type ClassValue = {
  className: string;
  properties: Map<string, Value>;
};
// ############################################################################################
// Debug Adapter Datatypes
type Thread = { id: number; name: string };
type StackFrame = {
  column: number;
  id: number;
  line: number;
  name: string;
  source: Source;
};
type Scope = {
  name: string;
  variablesReference: number;
};
type Variable = {
  evaluateName: string;
  name: string;
  type: string;
  value: string;
  variablesReference: number;
};

type Capabilities = {
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

type GotoTaget = {
  /**
   * Unique identifier for a goto target. This is used in the `goto` request.
   */
  id: number;

  /**
   * The name of the goto target (shown in the UI).
   */
  label: string;

  /**
   * The line of the goto target.
   */
  line: number;

  /**
   * The column of the goto target.
   */
  column?: number;

  /**
   * The end line of the range covered by the goto target.
   */
  endLine?: number;

  /**
   * The end column of the range covered by the goto target.
   */
  endColumn?: number;

  /**
   * A memory reference for the instruction pointer value represented by this
   * target.
   */
  instructionPointerReference?: string;
};

type Source = {
  /**
   * The short name of the source. Every source returned from the debug adapter
   * has a name.
   * When sending a source to the debug adapter this name is optional.
   */
  name?: string;

  /**
   * The path of the source to be shown in the UI.
   * It is only used to locate and load the content of the source if no
   * `sourceReference` is specified (or its value is 0).
   */
  path?: string;

  /**
   * If the value > 0 the contents of the source must be retrieved through the
   * `source` request (even if a path is specified).
   * Since a `sourceReference` is only valid for a session, it can not be used
   * to persist a source.
   * The value should be less than or equal to 2147483647 (2^31-1).
   */
  sourceReference?: number;

  /**
   * A hint for how to present the source in the UI.
   * A value of `deemphasize` can be used to indicate that the source is not
   * available or that it is skipped on stepping.
   * Values: 'normal', 'emphasize', 'deemphasize'
   */
  presentationHint?: 'normal' | 'emphasize' | 'deemphasize';

  /**
   * The origin of this source. For example, 'internal module', 'inlined content
   * from source map', etc.
   */
  origin?: string;

  /**
   * A list of sources that are related to this source. These may be the source
   * that generated this source.
   */
  sources?: Source[];

  /**
   * Additional data that a debug adapter might want to loop through the client.
   * The client should leave the data intact and persist it across sessions. The
   * client should not interpret the data.
   */
  adapterData?: any;
};
