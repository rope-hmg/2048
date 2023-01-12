export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

export function randomRangeInt(min, max) {
    return randomRange(min, max) | 0;
}
