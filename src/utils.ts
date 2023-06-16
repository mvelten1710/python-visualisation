import * as vscode from 'vscode';
import { VisualizationPanel } from './frontend/visualization_panel';

/**
 * Simply returns a array of all open text editors
 *
 * @returns an array of open vscode.TextEditor
 */
export function getOpenEditors(): readonly vscode.TextEditor[] {
  return vscode.window.visibleTextEditors;
}

export function createDecorationOptions(range: vscode.Range): vscode.DecorationOptions[] {
  return [
    {
      range: range,
    },
  ];
}

/**
 * Returns the value of the given config attribute
 *
 * @param configAttribute name of the attribute to get the value from
 * @returns the value of the requested config string
 */
export function getConfigValue<T>(configAttribute: string): T | undefined {
  return vscode.workspace.getConfiguration('programflow-visualization').get<T>(configAttribute);
}

// Read File -> Create Hash -> Save Hash -> Compare saved Hash with Hash from file directly -> If Hash is same use already generated Trace, If not start debugger
export async function setContextState(context: vscode.ExtensionContext, key: string, value: any): Promise<void> {
  return await context.workspaceState.update(key, value);
}

export async function getContextState<T>(context: vscode.ExtensionContext, key: string): Promise<T | undefined> {
  return await context.workspaceState.get<T>(key);
}

let uniqueId: number = -1;

export function backendToFrontend(traceElem: BackendTraceElem): FrontendTraceElem {
  uniqueId = -1;
  // Filter "special variables" & "function variables" out
  // Convert variables to html elements so that they can be used right away
  const frameItems = `
    <div class="column" id="frameItems">
      ${traceElem.stack.map((stackElem, index) => frameItem(index, stackElem)).join('')}
    </div>
  `;

  const keys = Array.from(Object.keys(traceElem.heap));
  const values = Array.from(Object.values(traceElem.heap));
  const objectItems = `
    <div class="column" id="objectItems">
      ${keys.map((name, index) => objectItem(name, values[index])).join('')}
    <div>
  `;
  return [traceElem.line, frameItems, objectItems];
}

function objectItem(name: string, value: HeapValue): string {
  let headline: string; 

  switch (value.type) {
    case 'instance':
      headline = value.name;
      break;
    case 'class':
      headline = value.type + ' ' + value.value.className;
      break;
    default:
      headline = value.type;
  }

  return `
    <div class="column object-item" id="objectItem${name}">
      <div>${headline}</div>
      <div>${heapValue(name, value)}</div>
    </div>
  `;
}

function heapValue(name: string, heapValue: HeapValue): string {
  let result = '';
  switch (heapValue.type) {
    case 'dict':
      const dictKeys = Array.from(Object.keys(heapValue.value));
      const dictValues = Array.from(Object.values(heapValue.value));
      result = `
        <div class="column" id="heapEndPointer${name}">
          ${dictKeys.map((key, index) => dictValue(key, dictValues[index])).join('')}
        </div>
      `;
      break;
    case 'instance':
      const instanceKeys = Array.from(Object.keys(heapValue.value));
      const instanceValues = Array.from(Object.values(heapValue.value)); // maybe endpointer look for if its exist and if add a second number or key or smth
      result = `
        <div class="column" id="heapEndPointer${name}">
          ${instanceKeys.map((key, index) => dictValue(key, instanceValues[index])).join('')}
        </div>
      `;
      break;
    case 'class':
      const objectKeys = Array.from(Object.keys(heapValue.value.properties));
      const objectValues = Array.from(Object.values(heapValue.value.properties));
      result = `
        <div class="column" id="heapEndPointer${name}">
          ${objectKeys.map((key, index) => dictValue(key, objectValues[index])).join('')}
        </div>
      `;
      break;
    case 'set':
      result = `
        <div class="row" id="heapEndPointer${name}">
          ${heapValue.value.map((v, i) => setValue(v)).join('')}
        </div>
      `;
      break;
    /* tuple, list, int[], int[][], ...*/
    default:
      result = `
        <div class="row" id="heapEndPointer${name}">
          ${heapValue.value.map((v, i) => listValue(v, i)).join('')}
        </div>
      `;
      break;
  }
  return result;
}

function dictValue(key: any, value: Value): string {
  uniqueId++;
  return `
    <div class="row">
      <div class="box box-content-dict">
        ${key}
      </div>
      <div class="box box-content-dict" ${value.type === 'ref' ? `id="${uniqueId}startPointer${value.value}"` : ''}>
        ${value.type === 'ref' ? '' : value.value}
      </div>
    </div>
  `;
}

function listValue(value: Value, index: number): string {
  uniqueId++;
  return `
    <div class="box list column">
      <div class="row box-content-top">
        ${index}
      </div>
      <div class="row box-content-bottom" ${value.type === 'ref' ? `id="${uniqueId}startPointer${value.value}"` : ''}>
        ${value.type === 'ref' ? '' : value.value}
      </div>
    </div>
  `;
}

function setValue(value: Value): string {
  uniqueId++;
  return `
    <div class="box box-set column">
      <div class="row box-content-bottom" ${value.type === 'ref' ? `id="${uniqueId}startPointer${value.value}"` : ''}>
        ${value.type === 'ref' ? '' : value.value}
      </div>
    </div>
  `;
}

// ?: stands for the number of the item
function frameItem(index: number, stackElem: StackElem): string {
  const keys = Array.from(Object.keys(stackElem.locals));
  const values = Array.from(Object.values(stackElem.locals));
  return `
    <div class="column frame-item" id="frameItem?">
      <div class="row subtitle" id="frameItemTitle">
        ${stackElem.frameName === '<module>' ? 'Global' : stackElem.frameName}
      </div>
      <div class="column ${index === 0 ? 'current-frame' : 'frame'}" id="frameItemSubItems">
        ${keys.map((name, index) => frameSubItem(stackElem.frameName, name, values[index])).join('')}
      </div>
    </div>
  `;
}

function frameSubItem(frameName: string, name: string, value: Value): string {
  return `
    <div class="row frame-item" id="subItem${name}">
      <div class="name-border">
        ${name}
      </div>
      <div class="value-border" ${value.type === 'ref' ? `id="${frameName}${name}Pointer${value.value}"` : ''}>
        ${value.type === 'ref' ? '' : value.value}
      </div>
    </div>
  `;
}

export async function startFrontend(
  id: string,
  context: vscode.ExtensionContext,
  trace: string
): Promise<VisualizationPanel | undefined> {
    return VisualizationPanel.getVisualizationPanel(id, context, JSON.parse(trace));
}
