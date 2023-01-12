<script setup>
import { reactive } from "vue";

const props = defineProps({
    label: {
        type: String,
        required: true,
    },
    minimum: Number,
    maximum: Number,
    value: {
        type: Number,
        required: true,
    },
});

const state = reactive({ count: props.value });

const emit = defineEmits(["update:value"]);

const max = props.maximum ?? Infinity;
const min = props.minimum ?? -Infinity;

function increment() {
    state.count = Math.min(state.count + 1, max);
    emit("update:value", state.count);
}

function decrement() {
    state.count = Math.max(state.count - 1, min);
    emit("update:value", state.count);
}
</script>

<template>
    {{ label }}: <span>{{ state.count }}</span>
    <button @click="increment">Increase {{ label }}</button>
    <button @click="decrement">Decrease {{ label }}</button>
</template>
