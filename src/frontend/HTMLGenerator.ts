export class HTMLGenerator {
    private backendTrace: BackendTrace;
    private frontendTrace: FrontendTrace;
    uniqueId: number = -1;


    constructor(trace: BackendTrace) {
        this.backendTrace = trace;
        this.frontendTrace = [];
    }

    generateHTML(): FrontendTrace {
        this.backendTrace.forEach(traceElement => {
            this.uniqueId = -1;

            const frameItems = `
                <div class="column" id="frameItems">
                    ${traceElement.stack.map((stackElem, index) => this.frameItem(index, stackElem)).join('')}
                </div>
            `;

            const keys = Array.from(Object.keys(traceElement.heap));
            const values = Array.from(Object.values(traceElement.heap));
            const objectItems = `
                <div class="column" id="objectItems">
                    ${keys.map((name, index) => this.objectItem(name, values[index])).join('')}
                <div>
            `;
            this.frontendTrace.push([traceElement.line, frameItems, objectItems]);
        });
        return this.frontendTrace;
    }

    private objectItem(name: string, value: HeapValue): string {
        let headline: string;

        switch (value.type) {
            case 'instance':
            case 'wrapper':
                headline = value.name;
                break;
            case 'class':
                headline = value.type + ' ' + value.value.className;
                break;
            case 'map':
                headline = value.mapType;
                break;
            default:
                headline = value.type;
        }

        return `
            <div class="column object-item" id="objectItem${name}">
            <div>${headline}</div>
            <div>${this.heapValue(name, value)}</div>
            </div>
        `;
    }

    private heapValue(name: string, heapValue: HeapValue): string {
        let result = '';
        switch (heapValue.type) {
            case 'dict':
                const dictKeys = Array.from(Object.keys(heapValue.value));
                const dictValues = Array.from(Object.values(heapValue.value));
                result = `
                    <div class="column" id="heapEndPointer${name}">
                        ${dictKeys.map((key, index) => this.dictValue(key, dictValues[index])).join('')}
                    </div>
                `;
                break;
            case 'map':
                const mapKeys = Array.from((heapValue.value as Array<[Value, Value]>).map((arrayTuple) => arrayTuple[0]));
                const mapValues = Array.from((heapValue.value as Array<[Value, Value]>).map((arrayTuple) => arrayTuple[1]));
                result = `
                    <div class="column" id="heapEndPointer${name}">
                        ${mapKeys.map((key, index) => this.dictValue(key, mapValues[index])).join('')}
                    </div>
                `;
                break;
            case 'wrapper':
                const innerText = Array.isArray(heapValue.value) ? heapValue.value.map((value) => this.wrapperValue(value)) : this.wrapperValue(heapValue.value);
                result = `
                    <div class="column" id="heapEndPointer${name}">
                        ${innerText}
                    </div>
                `;
                break;
            case 'instance':
                const instanceKeys = Array.from(Object.keys(heapValue.value));
                const instanceValues = Array.from(Object.values(heapValue.value)); // maybe endpointer look for if its exist and if add a second number or key or smth
                result = `
                    <div class="column" id="heapEndPointer${name}">
                        ${instanceKeys.map((key, index) => this.dictValue(key, instanceValues[index])).join('')}
                    </div>
                `;
                break;
            case 'class':
                const objectKeys = Array.from(Object.keys(heapValue.value.properties));
                const objectValues = Array.from(Object.values(heapValue.value.properties));
                result = `
                    <div class="column" id="heapEndPointer${name}">
                        ${objectKeys.map((key, index) => this.dictValue(key, objectValues[index])).join('')}
                    </div>
                `;
                break;
            case 'set':
                result = `
                    <div class="row" id="heapEndPointer${name}">
                        ${heapValue.value.map((v, i) => this.setValue(v)).join('')}
                    </div>
                `;
                break;
            /* tuple, list, int[], int[][], ...*/
            default:
                result = `
                    <div class="row" id="heapEndPointer${name}">
                        ${heapValue.value.map((v, i) => this.listValue(v, i)).join('')}
                    </div>
                `;
                break;
        }
        return result;
    }

    private wrapperValue(value: Value) {
        this.uniqueId++;
        return `
            <div class="box box-set column">
                <div class="row box-content-bottom" ${value.type === 'ref' ? `id="${this.uniqueId}startPointer${value.value}"` : ''}>
                    ${this.getCorrectValueOf(value)}
                </div>
            </div>
        `;
    }

    private dictValue(key: any, value: Value): string {
        this.uniqueId++;
        return `
            <div class="row">
                <div class="box box-content-dict" ${key.type === 'ref' ? `id="${this.uniqueId}startPointer${key.value}"` : ''}>
                    ${key.type === 'ref' ? '' : key.value ? key.value : key}
                </div>
                <div class="box box-content-dict" ${value.type === 'ref' ? `id="${this.uniqueId}startPointer${value.value}"` : ''}>
                    ${value.type === 'ref' ? '' : value.value}
                </div>
            </div>
        `;
    }

    private listValue(value: Value, index: number): string {
        this.uniqueId++;
        return `
            <div class="box list column">
                <div class="row box-content-top">
                    ${index}
                </div>
                <div class="row box-content-bottom" ${value.type === 'ref' ? `id="${this.uniqueId}startPointer${value.value}"` : ''}>
                    ${value.type === 'ref' ? '' : value.value}
                </div>
            </div>
        `;
    }

    private setValue(value: Value): string {
        this.uniqueId++;
        return `
            <div class="box box-set column">
                <div class="row box-content-bottom" ${value.type === 'ref' ? `id="${this.uniqueId}startPointer${value.value}"` : ''}>
                    ${value.type === 'ref' ? '' : value.value}
                </div>
            </div>
        `;
    }

    private frameItem(index: number, stackElem: StackElem): string {
        const keys = Array.from(Object.keys(stackElem.locals));
        const values = Array.from(Object.values(stackElem.locals));
        return `
            <div class="column frame-item" id="frameItem?">
                <div class="row subtitle" id="frameItemTitle">
                    ${stackElem.frameName === '<module>' ? 'Global' : stackElem.frameName}
                </div>
                <div class="column ${index === 0 ? 'current-frame' : 'frame'}" id="frameItemSubItems">
                    ${keys.map((name, index) => this.frameSubItem(stackElem.frameName, name, values[index])).join('')}
                </div>
            </div>
        `;
    }

    private frameSubItem(frameName: string, name: string, value: Value): string {
        return `
            <div class="row frame-item" id="subItem${name}">
                <div class="name-border">
                    ${name}
                </div>
                <div class="value-border" ${value.type === 'ref' ? `id="${frameName}${name}Pointer${value.value}"` : ''}>
                    ${this.getCorrectValueOf(value)}
                </div>
            </div>
        `;
    }

    private getCorrectValueOf(value: Value): string {
        switch (value.type) {
            case 'ref':
                return '';
            case 'str':
                return "\"" + value.value.replaceAll("'", "").replaceAll("\"", "") + "\"";
            case 'char':
                return "'" + value.value + "'";
            default:
                return `${value.value}`;
        }
    }
}
