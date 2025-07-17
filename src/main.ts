import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import 'uno.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // define your routes here
  ],
})

createApp(App).use(router).mount('#app')
