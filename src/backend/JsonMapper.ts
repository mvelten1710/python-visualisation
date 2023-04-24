export function validJsonFor(type: HeapType, value: string): string {
    return value.replace(/None|'|(\(|\))|(\{|\})|[0-9]+|(True|False)/g, (substring, _) => {
        switch (substring) {
            case 'None':
                return '"None"';
            case "'":
                return '"';
            case 'True':
                return JSON.stringify(substring);
            case '{':
                return type === 'set' ? '[' : '{';
            case '(':
                return '[';
            case '}':
                return type === 'set' ? ']' : '}';
            case ')':
                return ']';
            default:
                if (!isNaN(Number(substring))) {
                    return JSON.stringify(substring);
                }
                return '';
        }
    });
}
