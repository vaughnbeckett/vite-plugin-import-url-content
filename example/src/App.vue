<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import HelloWorld from './components/HelloWorld.vue'
import textContent from 'fetch-text::https://vaughnbeckett.github.io/tld/part.list'
import blobContent from 'fetch-blob::https://vaughnbeckett.github.io/tld/part.list'
import refUrl from 'fetch-ref::https://vaughnbeckett.github.io/tld/part.list'
import refUrlHash from 'fetch-ref:::https://vaughnbeckett.github.io/tld/part.list'
</script>

<template>
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <HelloWorld msg="Vite + Vue" />
  <p>{{ textContent.slice(0, 100) }} ...</p>
  <p>{{ blobContent.slice(0, 100) }} ...</p>
  <a :href="refUrl"> {{ refUrl }}</a>
  <p></p>
  <a :href="refUrlHash"> {{ refUrlHash }}</a>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
