<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-geist">
    <!-- Header -->
    <header class="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <div class="w-4 h-4 bg-white rounded-sm" />
            </div>
            <h1 class="text-xl font-bold text-slate-800">
              UnoCSS Demo
            </h1>
          </div>
          <nav class="flex gap-6">
            <a href="#" class="text-slate-600 hover:text-blue-600 transition-colors">Главная</a>
            <a href="#" class="text-slate-600 hover:text-blue-600 transition-colors">О нас</a>
            <a href="#" class="text-slate-600 hover:text-blue-600 transition-colors">Контакты</a>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-4 py-8">
      <!-- Hero Section -->
      <section class="text-center mb-12">
        <h2 class="text-4xl font-bold text-slate-800 mb-4">
          Добро пожаловать в мир
          <span class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">UnoCSS</span>
        </h2>
        <p class="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
          Демонстрация возможностей UnoCSS с использованием шрифтов Geist и различных утилит
        </p>
        <div class="flex gap-4 justify-center">
          <button class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Начать
          </button>
          <button class="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            Узнать больше
          </button>
        </div>
      </section>

      <!-- Typography Section -->
      <section class="mb-12">
        <h3 class="text-2xl font-bold text-slate-800 mb-6">
          Типографика
        </h3>
        <div class="grid md:grid-cols-2 gap-6">
          <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h4 class="font-bold text-slate-700 mb-4">
              Geist Font
            </h4>
            <p class="font-geist text-slate-600 mb-2">
              Обычный Geist (400)
            </p>
            <p class="font-geist font-bold text-slate-800 mb-2">
              Жирный Geist (700)
            </p>
            <p class="font-geist italic text-slate-500">
              Курсив Geist
            </p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h4 class="font-bold text-slate-700 mb-4">
              Geist Mono
            </h4>
            <code class="font-geist-mono text-sm text-slate-600 block mb-2">console.log('Hello World')</code>
            <code class="font-geist-mono font-bold text-sm text-slate-800 block mb-2">const app = new Vue()</code>
            <code class="font-geist-mono italic text-sm text-slate-500 block">// Комментарий</code>
          </div>
        </div>
      </section>

      <!-- Cards Section -->
      <section class="mb-12">
        <h3 class="text-2xl font-bold text-slate-800 mb-6">
          Компоненты
        </h3>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <div class="w-6 h-6 bg-blue-600 rounded" />
            </div>
            <h4 class="font-bold text-slate-800 mb-2">
              Быстрая разработка
            </h4>
            <p class="text-slate-600 text-sm">
              UnoCSS позволяет быстро создавать стили без написания CSS
            </p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <div class="w-6 h-6 bg-green-600 rounded" />
            </div>
            <h4 class="font-bold text-slate-800 mb-2">
              Производительность
            </h4>
            <p class="text-slate-600 text-sm">
              Генерация CSS по требованию для оптимальной производительности
            </p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <div class="w-6 h-6 bg-purple-600 rounded" />
            </div>
            <h4 class="font-bold text-slate-800 mb-2">
              Гибкость
            </h4>
            <p class="text-slate-600 text-sm">
              Настраиваемые шорткаты и правила для любых нужд
            </p>
          </div>
        </div>
      </section>

      <!-- Code Example -->
      <section class="mb-12">
        <h3 class="text-2xl font-bold text-slate-800 mb-6">
          Пример кода
        </h3>
        <div class="bg-slate-900 rounded-xl p-6 overflow-x-auto">
          <pre class="font-geist-mono text-sm text-slate-300"><code><span class="text-blue-400">export default</span> <span class="text-yellow-400">defineConfig</span>({
  <span class="text-green-400">shortcuts</span>: [
    { <span class="text-red-400">logo</span>: <span class="text-green-300">'i-logos-vue w-6em h-6em transform transition-800'</span> },
  ],
  <span class="text-green-400">presets</span>: [
    <span class="text-yellow-400">presetWind3</span>(),
    <span class="text-yellow-400">presetAttributify</span>(),
    <span class="text-yellow-400">presetIcons</span>(),
    <span class="text-yellow-400">presetWebFonts</span>({
      <span class="text-green-400">fonts</span>: {
        <span class="text-red-400">geist</span>: <span class="text-green-300">'Geist'</span>,
        <span class="text-red-400">'geist-mono'</span>: <span class="text-green-300">'Geist Mono'</span>,
      },
    }),
  ],
})</code></pre>
        </div>
      </section>

      <!-- Buttons and Forms -->
      <section class="mb-12">
        <h3 class="text-2xl font-bold text-slate-800 mb-6">
          Интерактивные элементы
        </h3>
        <div class="grid md:grid-cols-2 gap-6">
          <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h4 class="font-bold text-slate-700 mb-4">
              Кнопки
            </h4>
            <div class="flex flex-wrap gap-3">
              <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                Основная
              </button>
              <button class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                Успех
              </button>
              <button class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                Опасность
              </button>
              <button class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm">
                Вторичная
              </button>
            </div>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h4 class="font-bold text-slate-700 mb-4">
              Форма
            </h4>
            <div class="space-y-3">
              <input type="text" placeholder="Ваше имя" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <input type="email" placeholder="Email" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <textarea placeholder="Сообщение" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              <button class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Отправить
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Badges and Tags -->
      <section class="mb-12">
        <h3 class="text-2xl font-bold text-slate-800 mb-6">
          Теги и бейджи
        </h3>
        <div class="flex flex-wrap gap-2">
          <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">JavaScript</span>
          <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Vue.js</span>
          <span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">UnoCSS</span>
          <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">Vite</span>
          <span class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">TypeScript</span>
          <span class="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">Tailwind</span>
        </div>
      </section>

      <!-- Progress and Stats -->
      <section class="mb-12">
        <h3 class="text-2xl font-bold text-slate-800 mb-6">
          Прогресс и статистика
        </h3>
        <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div class="grid md:grid-cols-3 gap-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-blue-600 mb-2">
                2.5k
              </div>
              <div class="text-sm text-slate-600">
                Звезд на GitHub
              </div>
              <div class="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div class="bg-blue-600 h-2 rounded-full w-3/4" />
              </div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-green-600 mb-2">
                150+
              </div>
              <div class="text-sm text-slate-600">
                Контрибьюторов
              </div>
              <div class="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div class="bg-green-600 h-2 rounded-full w-5/6" />
              </div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-purple-600 mb-2">
                98%
              </div>
              <div class="text-sm text-slate-600">
                Покрытие тестами
              </div>
              <div class="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div class="bg-purple-600 h-2 rounded-full w-full" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="bg-slate-900 text-white py-12">
      <div class="max-w-6xl mx-auto px-4">
        <div class="grid md:grid-cols-4 gap-8">
          <div>
            <h4 class="font-bold mb-4">
              UnoCSS
            </h4>
            <p class="text-slate-400 text-sm">
              Мгновенный движок CSS по требованию
            </p>
          </div>
          <div>
            <h4 class="font-bold mb-4">
              Ресурсы
            </h4>
            <ul class="space-y-2 text-sm text-slate-400">
              <li><a href="#" class="hover:text-white transition-colors">Документация</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Примеры</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Playground</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-bold mb-4">
              Сообщество
            </h4>
            <ul class="space-y-2 text-sm text-slate-400">
              <li><a href="#" class="hover:text-white transition-colors">GitHub</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Discord</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Twitter</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-bold mb-4">
              Поддержка
            </h4>
            <ul class="space-y-2 text-sm text-slate-400">
              <li><a href="#" class="hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Помощь</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Контакты</a></li>
            </ul>
          </div>
        </div>
        <div class="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
          <p>&copy; 2024 UnoCSS Demo. Сделано с ❤️ и <span class="font-geist-mono">font-geist</span></p>
        </div>
      </div>
    </footer>
  </div>
</template>
