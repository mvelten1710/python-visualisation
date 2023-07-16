export function toValue(variable: Variable): Value {
    switch (variable.type) {
        case 'int':
        case 'float':
        /* Java specific */
        case 'byte':
        case 'short':
        case 'long':
        case 'double':
        case 'number':
            return {
                type: variable.type,
                value: Number(variable.value),
            };
        /* Python specific */
        case 'NoneType':
            return {
                type: 'none',
                value: 'None',
            };
        case 'str':
        /* Java specific */
            return {
                type: 'str',
                value: variable.value,
            };
        case 'char':
            return {
                type: 'char',
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
