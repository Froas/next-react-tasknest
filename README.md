# TaskNest

**TaskNest** is a modern frontend application for creating, visualizing, and managing universal roadmaps as flexible task lists. Built with [Next.js](https://nextjs.org) and React, TaskNest helps you plan learning, projects, personal goals, or any multi-step process with ease.

---

## Features

* **Custom roadmaps** for anything: learning paths, project planning, career development, and more.
* **Task organization** into stages and categories.
* **Progress tracking** with clear visual indicators.
* **Roadmap sharing** with other users *(planned)*.
* **Google Calendar integration** – sync key roadmap tasks with your Google Calendar.
* Integrations with other calendars (Outlook, Apple, etc.) are **in development**.
* **Telegram Bot integration** – receive task notifications and interact with your roadmap via Telegram.
* Integrations with other bots (Slack, Discord, Microsoft Teams) are **in development**.

---

## Screenshots

> *Add later*

---

## Getting Started

1. **Install dependencies**

   ```bash
   npm install       # or yarn install / pnpm install / bun install
   ```

2. **Run the development server**

   ```bash
   npm run dev       # or yarn dev / pnpm dev / bun dev
   ```

3. Open **[http://localhost:3000](http://localhost:3000)** in your browser to view the app.

4. Edit `app/page.tsx` (or any component) and save to see hot-reloaded updates.

---

## Environment Variables

Create a `.env` file in the project root:

```env
NEXTAUTH_SECRET=
ALGORITHM=
NEXTAUTH_URL=
NEXTAUTH_SESSION_TTL_SECONDS=2592000
API_URL=http://127.0.0.1:8000
GOOGLE_CALENDAR_API_KEY=
TELEGRAM_BOT_TOKEN=
GOOGLE_CLIENT_ID=
SCOPE=
REDIRECT_URL=
```

> Replace placeholders with real credentials for your environment and integrations.

The NextAuth session lasts 30 days and keeps the backend access token out of
browser storage. While the app is active, NextAuth automatically replaces the
one-hour access token through the backend refresh endpoint.

The browser uses the same-origin `/backend` path, which Next.js proxies to
`API_URL`. This means only the Next.js port needs to be exposed when using a
tunnel. Set `NEXTAUTH_URL` to the tunnel's public HTTPS URL and restart Next.js.

---

## Tech Stack

* **Next.js** — Framework for SSR / SSG
* **React** — UI library
* **Tailwind CSS** — Utility-first CSS framework for rapid UI development
* **TypeScript** — Static typing
* **next/font** — Font optimization ([Geist](https://vercel.com/font))
* **NextAuth** — Authentication (Google, Telegram, more)
* **Google Calendar API** — Calendar sync
* **Telegram Bot API** — Chatbot notifications
* *(Slack, Discord, MS Teams integrations coming soon)*

---

## Deployment

The fastest way to deploy is with **[Vercel](https://vercel.com/new?filter=next.js)** (creators of Next.js).

1. Push your repo to GitHub/GitLab/Bitbucket.
2. Import the project into Vercel.
3. Set the environment variables in the Vercel dashboard.
4. Deploy — your app will be live on a **vercel.app** domain.

See the [Next.js deployment guide](https://nextjs.org/docs/app/building-your-application/deploying) for details.

---

## Learn More

* [Next.js Documentation](https://nextjs.org/docs)
* [Interactive Next.js Tutorial](https://nextjs.org/learn)
* [Next.js GitHub Repository](https://github.com/vercel/next.js)

---

## Feedback & Contributions

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add YourFeature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

Thanks for helping make **TaskNest** better! \:rocket:
