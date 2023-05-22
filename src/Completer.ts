class Completer<T> {
    public readonly promise: Promise<T>;
    public complete!: (value: (PromiseLike<T> | T)) => void;
    public reject!: (reason?: any) => void;

    public constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.complete = resolve;
            this.reject = reject;
        });
    }
}

export default Completer;
