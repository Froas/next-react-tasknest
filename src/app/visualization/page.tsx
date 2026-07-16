'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Accessibility, Flag, Footprints, Mountain, RotateCcw, Sparkles } from 'lucide-react';
import { withAuth } from '@/hoc/withAuth';
import { ProgressMap } from '@/components/visualization/ProgressMap';
import { AnimalId, ANIMALS } from '@/lib/journeyAnimals';
import { JOURNEY_THEME_IDS, JOURNEY_THEMES, getJourneyTheme } from '@/lib/journeyThemes';
import { goalsApi } from '@/lib/api';
import { calculateStructuralGoalProgress } from '@/lib/progress';
import { GoalItem, StatusType, TaskItem } from '@/lib/types';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useStore } from '@/store/useStore';
import styles from './VisualizationPage.module.css';

const completedStatuses = new Set([StatusType.FINISHED, StatusType.CLOSED]);
const inactiveStatuses = new Set([
 StatusType.FINISHED,
 StatusType.CLOSED,
 StatusType.ABORTED,
 StatusType.CANCELLED,
]);

const isCompleted = (status: StatusType) => completedStatuses.has(status);
const isStructuralTask = (task: TaskItem) => task.kind !== 'routine';

const VisualizationPage: React.FC = () => {
 useDocumentTitle('Journey map');
 const goals = useStore((state) => state.goals);
 const isLoading = useStore((state) => state.isLoadingGoals);
 const error = useStore((state) => state.goalsError);
 const fetchGoals = useStore((state) => state.fetchGoals);
 const updateGoal = useStore((state) => state.updateGoal);
 const [selectedGoalId, setSelectedGoalId] = useState('');
 const [replayKey, setReplayKey] = useState(0);
 const [reducedMotion, setReducedMotion] = useState(false);

 useEffect(() => {
 void fetchGoals();
 }, [fetchGoals]);

 useEffect(() => {
 if (selectedGoalId && goals.some((goal) => goal.id === selectedGoalId)) return;
 const nextGoal = goals.find((goal) => !inactiveStatuses.has(goal.status)) ?? goals[0];
 setSelectedGoalId(nextGoal?.id ?? '');
 }, [goals, selectedGoalId]);

 const selectedGoal = useMemo(
 () => goals.find((goal) => goal.id === selectedGoalId) ?? null,
 [goals, selectedGoalId],
 );
 const selectedTheme = getJourneyTheme(selectedGoal?.journey_theme_id);
 const selectedCharacter = selectedGoal?.journey_character_id ?? 'bat';

 const handleThemeChange = async (journeyThemeId: GoalItem['journey_theme_id']) => {
 if (!selectedGoal || !journeyThemeId || journeyThemeId === selectedGoal.journey_theme_id) return;
 const previousGoal = selectedGoal;
 updateGoal({ ...selectedGoal, journey_theme_id: journeyThemeId });
 try {
 const updated = await goalsApi.update({ id: selectedGoal.id, journey_theme_id: journeyThemeId });
 updateGoal({ ...selectedGoal, ...updated });
 } catch (themeError) {
 console.error('Failed to update journey theme:', themeError);
 updateGoal(previousGoal);
 }
 };

 const handleCharacterChange = async (journeyCharacterId: AnimalId) => {
 if (!selectedGoal || journeyCharacterId === selectedCharacter) return;
 const previousGoal = selectedGoal;
 updateGoal({ ...selectedGoal, journey_character_id: journeyCharacterId });
 try {
 const updated = await goalsApi.update({ id: selectedGoal.id, journey_character_id: journeyCharacterId });
 updateGoal({ ...selectedGoal, ...updated });
 } catch (characterError) {
 console.error('Failed to update journey character:', characterError);
 updateGoal(previousGoal);
 }
 };

 const journey = useMemo(() => {
 if (!selectedGoal) return null;
 const milestones = selectedGoal.milestones ?? [];
 const milestoneTasks = milestones.flatMap((milestone) => milestone.tasks ?? []);
 const goalTasks = (selectedGoal.tasks ?? []).filter(isStructuralTask);
 const structuralTasks = [...milestoneTasks.filter(isStructuralTask), ...goalTasks];
 const progress = calculateStructuralGoalProgress(selectedGoal);
 const currentMilestone = milestones.find((milestone) => !isCompleted(milestone.status));
 return {
 progress,
 completedMilestones: milestones.filter((milestone) => isCompleted(milestone.status)).length,
 totalMilestones: milestones.length,
 completedTasks: structuralTasks.filter((task) => isCompleted(task.status)).length,
 totalTasks: structuralTasks.length,
 currentCheckpoint: currentMilestone?.title ?? (progress >= 100 ? 'Journey complete' : 'Final destination'),
 };
 }, [selectedGoal]);

 return (
 <main className={styles.page}>
 <section className={styles.hero}>
 <div>
 <div className={styles.eyebrow}><Mountain size={16} /> Progress map</div>
 <h1>Journey map</h1>
 <p>One progress system, six visual journeys. Milestones and character progress stay intact when the environment changes.</p>
 </div>
 <div className={styles.heroBadge}>
 <Sparkles size={18} />
 <span><strong>Journey Themes</strong>Shared route + character</span>
 </div>
 </section>

 <section className={styles.controls} aria-label="Journey map controls">
 <label className={styles.field}>
 <span>Goal</span>
 <select value={selectedGoalId} onChange={(event) => setSelectedGoalId(event.target.value)} disabled={goals.length === 0}>
 {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
 </select>
 </label>
 <label className={styles.field}>
 <span>Journey theme</span>
 <select
 value={selectedTheme.id}
 onChange={(event) => void handleThemeChange(event.target.value as GoalItem['journey_theme_id'])}
 disabled={!selectedGoal}
 >
 {JOURNEY_THEME_IDS.map((themeId) => (
 <option key={themeId} value={themeId}>{JOURNEY_THEMES[themeId].name}</option>
 ))}
 </select>
 <small>Changes only the environment and route.</small>
 </label>
 <label className={styles.field}>
 <span>Character</span>
 <select value={selectedCharacter} onChange={(event) => void handleCharacterChange(event.target.value as AnimalId)}>
 {Object.values(ANIMALS).map((animal) => <option key={animal.id} value={animal.id}>{animal.name}</option>)}
 </select>
 <small>All choices use reusable PNG sprite sheets.</small>
 </label>
 <button className={styles.secondaryButton} type="button" onClick={() => setReplayKey((value) => value + 1)} disabled={!selectedGoal}>
 <RotateCcw size={17} /> Replay climb
 </button>
 <label className={styles.motionToggle}>
 <input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} />
 <Accessibility size={17} /> Reduced motion
 </label>
 </section>

 {isLoading && goals.length === 0 ? (
 <section className={styles.stateCard}>Generating your journey…</section>
 ) : error && goals.length === 0 ? (
 <section className={styles.stateCard}>
 <strong>Could not load goals.</strong>
 <button type="button" onClick={() => void fetchGoals({ force: true })}>Try again</button>
 </section>
 ) : !selectedGoal || !journey ? (
 <section className={styles.stateCard}>
 <Mountain size={36} />
 <strong>No goal to visualize yet.</strong>
 <span>Create a goal with milestones and tasks, then its journey will appear here.</span>
 </section>
 ) : (
 <>
 <section className={styles.summary}>
 <div className={styles.goalSummary}>
 <span className={styles.summaryLabel}>Current expedition</span>
 <h2>{selectedGoal.title}</h2>
 <p>{selectedGoal.description || 'The final destination represents completion of this goal.'}</p>
 <div className={styles.progressTrack} aria-label={`${Math.round(journey.progress)} percent complete`}>
 <span style={{ width: `${Math.max(0, Math.min(100, journey.progress))}%` }} />
 </div>
 </div>
 <div className={styles.stat}>
 <strong>{Math.round(journey.progress)}%</strong>
 <span>Structural climb</span>
 </div>
 <div className={styles.stat}>
 <strong>{journey.completedMilestones}/{journey.totalMilestones}</strong>
 <span><Flag size={15} /> Camps reached</span>
 </div>
 <div className={styles.stat}>
 <strong>{journey.completedTasks}/{journey.totalTasks}</strong>
 <span><Footprints size={15} /> Trail steps</span>
 </div>
 </section>

 <ProgressMap
 goal={selectedGoal}
 theme={selectedTheme}
 progress={journey.progress}
 replayKey={replayKey}
 forceReducedMotion={reducedMotion}
 character={selectedCharacter}
 />

 <section className={styles.currentCard}>
 <span>Current checkpoint</span>
 <strong>{journey.currentCheckpoint}</strong>
 <p>The map is deterministic for this goal, so it keeps its landscape between reloads while progress and character position stay live.</p>
 </section>
 </>
 )}
 </main>
 );
};

export default withAuth(VisualizationPage);
