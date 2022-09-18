type Trace = {
    type: string
    length: number,
    items: [
        {
            name: string,
            trace: Trace | Variable
        }
    ]
};

type Variable = {
    type: string,
    value: string | number | boolean
};

type Thread = {id: number, name: string};