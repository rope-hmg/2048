<script setup>
defineProps({
    hide: {
        type: Boolean,
        required: true,
    },
    text: {
        type: Array,
        required: true,
    },

});



</script>

<template>
    <div id="win" :class="{ hide }" class="overlay">
        <span v-for="line in text" v-bind:key="line">{{ line }}</span>
    </div>
</template>

<style scoped>
.overlay {
    background: rgba(0 0 0 / 20%);
    width: 100%;
    height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 65px;
}

.hide {
    display: none;
}
</style>
