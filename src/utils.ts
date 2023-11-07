export class ObservableMap<K, V> extends Map<K, V> {
    private onAddListeners: Map<string, (key: K, value: V) => void> = new Map();
    
    addOnAddListener(listenerName: string, listener: (key: K, value: V) => void) {
        this.onAddListeners.set(listenerName, listener);
    }
    
    removeOnAddListener(listenerName: string) {
        this.onAddListeners.delete(listenerName);
    }
    
    set(key: K, value: V) {
        super.set(key, value);
        this.onAddListeners.forEach((listener) => {
            listener(key, value);
        });
        return this;
    }
}

export class TreeNode<K, T> {
    key: K;
    value: T;
    children: TreeNode<K, T>[] = [];

    constructor(key: K, value: T) {
        this.key = key;
        this.value = value;
    }

    public addChild(child: TreeNode<K, T>) {
        this.children.push(child);
    }

    public hasChild(key: K) {
        return this.children.find(child => child.key === key) !== undefined;
    }
}