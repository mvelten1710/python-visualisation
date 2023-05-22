export const ALL_PRIMITIVE_VARIABLES = `
positiveInt = 1
negativeInt = -1
positiveFloat = 1.0
negativeFloat = -1.0
emptyString = ''
fullString = 'Hello World!'
isNone = None
trueBool = True
falseBool = False
`;

export const LISTS = `
simpleList = [1, 2, 3, 4, 5]
stackedList = [1, 2, [4, 5], [6, [7, 8, 9], [[10, 11], [23]]], 7]
stackedMixedList = [1, 2.0, ["4", 5.2], ["6", ["7", "8"], 9, [["10", 11.11], ["12"]]], "13", 14]
`;

export const TUPLES = `
simpleTuple = (1, 2)
stackedTuples = ((1, (2, 3)), (4, 5))
stackedMixedTuples = ((1, ("2", 3)), (4.5, ((5, None), "7")))
`;

export const SETS = `
simpleSet = {1, 2, 3, 4, 5}
`;

export const DICTS = `
simpleDict = { "a" : 1, "b" : 2, "c" : 3}
stackedDict = { "a" : 1, "b" : { "ab" : { "1" : { "1" : 1, "2" : 2 }, "2" : { "2" : 2, "1" : 1} }}, "c" : 3 }
stackedMixedDict = { "a" : 1.0, "b" : { "ab" : { "1" : { 1 : "1", 2.9 : "2" }, "2" : { 2 : "2", 1 : "1"} }}, "c" : 3.9 }
`;

export const CLASSES = `
class simpleClass:
    testVar = 1
    test2Var = 2

class stackedClass:
    testVar = 1
    test2Var = 2
    class innerClass:
        test3Var = 3
`;

export const MIXED_TYPES = `
tupleList = ([1, 2, [3, [4, 5, 5.5, 5.6, 5.7]]], [6, 7, [8, 9]])
listTuple = [([1, 2], 3), 4, 5, [((6, 7), 8), 9, 10], 11, 12]
dictTupleList = { "list" : [1, 2, 3], "tuple" : (1, 2), "tupleList" : ([1, 2], [3, 4])}
`;

export const INFINITE_REFERENCES = `
sampleList = []
sampleList.append(sampleList)
`;
