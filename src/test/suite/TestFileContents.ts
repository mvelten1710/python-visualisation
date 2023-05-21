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

