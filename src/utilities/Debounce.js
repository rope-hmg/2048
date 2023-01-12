export function debounce(fn, ms) {
    let handle;

    return (...args) => {
        clearTimeout(handle);
        handle = setTimeout(() => fn(...args), ms);
    };
}
