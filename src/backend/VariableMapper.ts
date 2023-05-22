export function toValue(variable: Variable): Value {
    switch (variable.type) {
        case 'int':
            return {
                type: 'int',
                value: parseInt(variable.value),
            };
        case 'float':
            return {
                type: 'float',
                value: parseFloat(variable.value),
            };
        case 'NoneType':
        case 'str':
            return {
                type: 'str',
                value: variable.value,
            };
        case 'bool':
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
