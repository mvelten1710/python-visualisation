# TODOs
### Tasks die noch überprüft oder erledigt werden müssen, damit alles rund läuft

## Frontend
- Tests Allgemein
  - Bisher bestehen keine Test für das Frontend
- Referenzpfiele gehen in bestimmten Use-Cases kaputt
  - Das Anfangs-& Endelement kann in bestimmten Situation nicht gefunden werden, um den Pfeil zu zeichenen
  - Beispiel Code: 
    ````
    def listSum(numbers):
        if not numbers:
            return 0
        else:
            (f, rest) = numbers
            return f + listSum(rest)


    myList = (1, (2, (3, None)))
    total = listSum(myList)
    ````
- Referenzen gehen aktuell nur eins in die Tiefe, wenn Objekte ineinander verschachtelt sind
  - Beispiel
    - ![Extension](extension.png)
    - ![PythonTutor](tutor.png)

## Backend
- Tests Allgemein
  - Bisher bestehen keine Test für das Backend