<script setup lang="ts">
import type { IButtonProps } from './props'
import { computed } from 'vue'

const { size = 'default', variant = 'primary' } = defineProps<IButtonProps>()

const buttonClasses = computed(() => [
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    'bg-primary text-primary-foreground shadow hover:bg-primary/90': variant === 'primary',
    'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90': variant === 'destructive',
    'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground': variant === 'outline',
    'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80': variant === 'secondary',
    'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
    'text-primary underline-offset-4 hover:underline': variant === 'link',
  },
  {
    'h-9 px-4 py-2': size === 'default',
    'h-8 rounded-md px-3 text-xs': size === 'small',
    'h-10 rounded-md px-8 text-sm': size === 'medium',
    'h-11 rounded-md px-8 text-base': size === 'large',
    'h-10 w-10 p-0': size === 'icon',
  },
])
</script>

<template>
  <button
    :type="type"
    :class="buttonClasses"
    :disabled="disabled"
  >
    <slot>{{ label }}</slot>
  </button>
</template>
