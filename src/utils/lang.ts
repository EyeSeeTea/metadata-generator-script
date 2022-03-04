export function zipObject<Value>(keys: string[], values: Value[]) {
    return keys.reduce((acc, key, idx) => {
        acc[key] = values[idx];
        return acc;
    }, {} as Record<string, Value>);
}
