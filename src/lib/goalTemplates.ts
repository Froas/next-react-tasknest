import { PriorityType } from './types';

export interface MilestoneTemplate {
 title: string;
 description: string;
 taskTitles: string[];
}

export interface GoalTemplate {
 id: string;
 emoji: string;
 title: string;
 description: string;
 durationDays: number;
 priority: PriorityType;
 milestones: MilestoneTemplate[];
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
 {
 id: 'run-5k',
 emoji: '🏃',
 title: 'Run a 5k',
 description: 'Build up from couch to running a 5km without stopping.',
 durationDays: 56,
 priority: PriorityType.HIGH,
 milestones: [
 {
 title: 'Get the gear',
 description: 'Pick a kit you actually want to put on.',
 taskTitles: ['Buy running shoes', 'Pick a running playlist', 'Schedule first run'],
 },
 {
 title: 'Run 1km without stopping',
 description: 'First real milestone — build the habit.',
 taskTitles: ['Run 3× this week (any distance)', 'Increase to 1km on third week'],
 },
 {
 title: 'Run 3km',
 description: 'Halfway there.',
 taskTitles: ['Add a long-run day on weekends', 'Track pace and recovery'],
 },
 {
 title: 'Run 5km',
 description: 'Finish line. Sign up for a parkrun.',
 taskTitles: ['Find a local 5k event', 'Run 5k in training', 'Run the event'],
 },
 ],
 },
 {
 id: 'read-12-books',
 emoji: '📚',
 title: 'Read 12 books this year',
 description: 'A book a month. Pick a mix of fiction and non-fiction.',
 durationDays: 365,
 priority: PriorityType.MEDIUM,
 milestones: [
 {
 title: 'Build the reading list',
 description: 'Curate the year ahead.',
 taskTitles: ['Pick 12 books', 'Order the first 3', 'Set a 30-min daily reading slot'],
 },
 {
 title: 'Q1 — 3 books',
 description: '',
 taskTitles: ['Finish book 1', 'Finish book 2', 'Finish book 3'],
 },
 {
 title: 'Q2 — 6 books',
 description: '',
 taskTitles: ['Finish book 4', 'Finish book 5', 'Finish book 6'],
 },
 {
 title: 'Q3 — 9 books',
 description: '',
 taskTitles: ['Finish book 7', 'Finish book 8', 'Finish book 9'],
 },
 {
 title: 'Q4 — 12 books',
 description: 'Wrap the year.',
 taskTitles: ['Finish book 10', 'Finish book 11', 'Finish book 12', 'Reflect: top 3 of the year'],
 },
 ],
 },
 {
 id: 'learn-language',
 emoji: '🗣️',
 title: 'Reach conversational fluency',
 description: 'Daily practice + weekly conversation to get to A2/B1 in 6 months.',
 durationDays: 180,
 priority: PriorityType.HIGH,
 milestones: [
 {
 title: 'Foundation (weeks 1-4)',
 description: 'Alphabet, greetings, numbers, basic verbs.',
 taskTitles: ['Pick an app or course', 'Daily 20-min practice', 'Learn first 100 words'],
 },
 {
 title: 'Conversation kickstart (weeks 5-12)',
 description: 'First real exchanges with a tutor.',
 taskTitles: ['Book weekly tutor sessions', 'Watch beginner content with subtitles', '500-word vocab'],
 },
 {
 title: 'Daily life topics (weeks 13-20)',
 description: 'Order food, ask directions, talk about your week.',
 taskTitles: ['Switch phone language', 'Practice with native partner', '1500-word vocab'],
 },
 {
 title: 'Conversational test (weeks 21-26)',
 description: 'A2/B1 self-assessment.',
 taskTitles: ['Take a placement test', 'Have a 30-min unscripted call', 'Reflect on next phase'],
 },
 ],
 },
 {
 id: 'ship-side-project',
 emoji: '🚀',
 title: 'Ship a side project',
 description: 'From idea to launched-and-used in 90 days.',
 durationDays: 90,
 priority: PriorityType.HIGH,
 milestones: [
 {
 title: 'Define the scope',
 description: 'What you build, what you cut, who it\'s for.',
 taskTitles: ['Write a one-line pitch', 'List MVP features (≤5)', 'Pick the stack'],
 },
 {
 title: 'Build the spike',
 description: 'Crappy version that proves the core works.',
 taskTitles: ['Set up the repo and CI', 'Implement the core feature', 'Smoke-test end-to-end'],
 },
 {
 title: 'Polish for launch',
 description: 'Make it presentable.',
 taskTitles: ['Onboarding flow', 'Landing page', 'Analytics + error reporting'],
 },
 {
 title: 'Launch and learn',
 description: 'Get it in front of people.',
 taskTitles: ['Post on Hacker News / Reddit / X', 'Talk to 5 users', 'Decide: keep building or sunset'],
 },
 ],
 },
];
