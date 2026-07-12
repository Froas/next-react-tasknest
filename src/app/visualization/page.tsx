'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Accessibility, Flag, Footprints, Mountain, RotateCcw, Sparkles } from 'lucide-react';
import { withAuth } from '@/hoc/withAuth';
import { MountainProgressMap } from '@/components/visualization/MountainProgressMap';
import { AnimalId, ANIMALS } from '@/lib/journeyAnimals';
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
 useDocumentTitle('Mountain journey');
 const goals = useStore((state) => state.goals);
 const isLoading = useStore((state) => state.isLoadingGoals);
 const error = useStore((state) => state.goalsError);
 const fetchGoals = useStore((state) => state.fetchGoals);
 const [selectedGoalId, setSelectedGoalId] = useState('');
 const [animalId, setAnimalId] = useState<AnimalId>('bat');
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
 currentCheckpoint: currentMilestone?.title ?? (progress >= 100 ? 'Summit reached' : 'Route to summit'),
 };
 }, [selectedGoal]);

 return (
 <main className={styles.page}>
 <section className={styles.hero}>
 <div>
 <div className={styles.eyebrow}><Mountain size={16} /> Progress map</div>
 <h1>Mountain journey</h1>
 <p>Every goal generates its own mountain. Milestones become camps, structural tasks become trail steps, and your character follows real progress.</p>
 </div>
 <div className={styles.heroBadge}>
 <Sparkles size={18} />
 <span><strong>Prototype 01</strong>Generated mountain + character</span>
 </div>
 </section>

 <section className={styles.controls} aria-label="Mountain journey controls">
 <label className={styles.field}>
 <span>Goal</span>
 <select value={selectedGoalId} onChange={(event) => setSelectedGoalId(event.target.value)} disabled={goals.length === 0}>
 {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
 </select>
 </label>
 <label className={styles.field}>
 <span>Character</span>
 <select value={animalId} onChange={(event) => setAnimalId(event.target.value as AnimalId)}>
 {Object.values(ANIMALS).map((animal) => <option key={animal.id} value={animal.id}>{animal.name}</option>)}
 </select>
 <small>Bat now; sprite animals and custom uploads fit this slot later.</small>
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
 <section className={styles.stateCard}>Generating your mountain…</section>
 ) : error && goals.length === 0 ? (
 <section className={styles.stateCard}>
 <strong>Could not load goals.</strong>
 <button type="button" onClick={() => void fetchGoals({ force: true })}>Try again</button>
 </section>
 ) : !selectedGoal || !journey ? (
 <section className={styles.stateCard}>
 <Mountain size={36} />
 <strong>No goal to visualize yet.</strong>
 <span>Create a goal with milestones and tasks, then its mountain will appear here.</span>
 </section>
 ) : (
 <>
 <section className={styles.summary}>
 <div className={styles.goalSummary}>
 <span className={styles.summaryLabel}>Current expedition</span>
 <h2>{selectedGoal.title}</h2>
 <p>{selectedGoal.description || 'The summit represents completion of this goal.'}</p>
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

 <MountainProgressMap
 goal={selectedGoal}
 progress={journey.progress}
 replayKey={replayKey}
 forceReducedMotion={reducedMotion}
 animalId={animalId}
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
