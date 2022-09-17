class Trace {
    language: string = 'none';
    variables: Variable[] = [];
}

class Variable {
    name: string = 'none';
    value: any;
}