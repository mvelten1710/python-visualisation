export function toValue(variable: Variable): Value {
    switch (variable.type) {
        case 'int':
        case 'float':
        /* Java specific */
        case 'byte':
        case 'short':
        case 'long':
        case 'double':
            return {
                type: variable.type,
                value: Number(variable.value),
            };
        /* Python specific */
        case 'NoneType':
        case 'str':
        /* Java specific */
        case 'char':
        case 'String':
            return {
                type: 'str',
                value: variable.value,
            };
        /* Python specific */
        case 'bool':
        /* Java specific */
        case 'boolean':
            return {
                type: 'bool',
                value: variable.value,
            };
        default:
            return {
                type: 'ref',
                value: variable.variablesReference,
            };
    }
}
