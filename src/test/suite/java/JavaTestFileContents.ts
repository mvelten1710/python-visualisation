export const ALL_PRIMITIVE_VARIABLES = `
public class JavaPrimitiveVariableTestClass {
    public static void main(String[] args) {
        byte positiveByte = 1;
        byte negativeByte = -1;
        short positiveShort = 150;
        short negativeShort = -150;
        int positiveInt = 55555;
        int negativeInt = -55555;
        long positiveLong = 2947483647l;
        long negativeLong = -2947483647l;
        float positiveFloat = 1.0123f;
        float negativeFloat = -1.0123f;
        double positiveDouble = 1.01234d;
        double negativeDouble = -1.01234d;
        char fullChar = 'a';
        boolean trueBool = true;
        boolean falseBool = false;
    }
}
`;

export const ALL_WRAPPER_VARIABLES = `
public class JavaWrapperVariableTestClass {
    public static void main(String[] args) {
        Byte positiveByte = 1;
        Byte negativeByte = -1;
        Short positiveShort = 150;
        Short negativeShort = -150;
        Integer positiveInt = 55555;
        Integer negativeInt = -55555;
        Long positiveLong = 2947483647l;
        Long negativeLong = -2947483647l;
        Float positiveFloat = 1.0123f;
        Float negativeFloat = -1.0123f;
        Double positiveDouble = 1.01234d;
        Double negativeDouble = -1.01234d;
        Character fullChar = 'a';
        Boolean trueBool = true;
        Boolean falseBool = false;
        String emptyString = "";
        String fullString = "Hello World!";
    }
}
`;

export const ARRAY_VARIABLES = `
public class JavaArrayVariableTestClass {
    public static void main(String[] args) {
        int[] intArray = { 1, 2, 3, 4};
        Integer[] integerArray = { 1, 2, 3, 4};
        int[][] dimIntArray = { {1}, {2}, {3, 4}};
        Integer[][] dimIntegerArray = { {1}, {2}, {3, 4}};
    }
}
`;

export const CLASS_VARIABLES = `
public class JavaClassTestClass {
    public static void main(String[] args) {
        TestClass testClass = new TestClass(1d, 2d);
    }
}

class TestClass {
    private double x;
    private Double y;

    TestClass(double x, Double y) {
        this.x = x;
        this.y = y;
    }
}
`;

export const ARRAY_LIST_VARIABLES = `
import java.util.List;
import java.util.ArrayList;
public class JavaArrayListTestClass {
    public static void main(String[] args) {
        List<Double> arrayList = new ArrayList<>();
        arrayList.add(3d);
        arrayList.add(2d);
        arrayList.add(1d);
    }
}
`;

export const LINKED_LIST_VARIABLES = `
import java.util.List;
import java.util.LinkedList;
public class JavaLinkedListTestClass {
    public static void main(String[] args) {
        List<Double> linkedList = new LinkedList<>();
        linkedList.add(3d);
        linkedList.add(2d);
        linkedList.add(1d);
    }
}
`;

export const HASH_MAP_VARIABLES = `
import java.util.Map;
import java.util.HashMap;
public class JavaHashMapTestClass {
    public static void main(String[] args) {
        Map<String, Integer> hashMap = new HashMap<>();
        hashMap.put("Audi", 1);
        hashMap.put("BMW", 2);
    }
}
`;

export const HASH_SET_VARIABLES = `
import java.util.Set;
import java.util.HashSet;
public class JavaHashSetTestClass {
    public static void main(String[] args) {
        Set<Integer> hashSet = new HashSet<>();
        hashSet.add(1);
        hashSet.add(2);
    }
}
`;
