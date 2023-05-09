export function validJsonFor(type: HeapType, value: string): string {
    let isActuallyString = false; // FIXME numbers with . not working
    return value.replace(/None|'|(\(|\))|(\{|\})|[0-9]+|(True|False)/g, (substring, _) => {
        switch (substring) {
            case 'None':
                isActuallyString = false;
                return '"None"';
            case "'":
                isActuallyString = true;
                return '"';
            case 'True':
            case 'False':
                isActuallyString = false;
                return JSON.stringify(substring);
            case '{':
                isActuallyString = false;
                return type === 'set' ? '[' : '{';
            case '(':
                isActuallyString = false;
                return '[';
            case '}':
                isActuallyString = false;
                return type === 'set' ? ']' : '}';
            case ')':
                isActuallyString = false;
                return ']';
            default:
                if (!isNaN(Number(substring)) && !isActuallyString) {
                    isActuallyString = false;
                    return JSON.stringify(substring);
                }
                return substring;
        }
    });
}
