"use client";

import React, { useState, useEffect, useRef } from 'react';
import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, StatusType } from '@/lib/types';
import { milestonesApi } from '@/lib/api';
import { withAuth } from '@/hoc/withAuth';
import { useTheme } from '@/context/ThemeContext';
import { useStore } from '@/store/useStore';

const GoalVisualization = () => {
 const { theme } = useTheme();
 const goals = useStore((s) => s.goals);
 const fetchGoals = useStore((s) => s.fetchGoals);
 const isLoadingGoals = useStore((s) => s.isLoadingGoals);
 const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
 const [milestones, setMilestones] = useState<Milestone[]>([]);
 const svgRef = useRef<SVGSVGElement>(null);
 const [hoveredMilestone, setHoveredMilestone] = useState<string | null>(null);
 const [activeMilestone, setActiveMilestone] = useState<string | null>(null);
 const [hoveredTask, setHoveredTask] = useState<string | null>(null);
 const [activeTask, setActiveTask] = useState<string | null>(null);
 const [hoveredSubtask, setHoveredSubtask] = useState<string | null>(null);
 const [activeSubtask, setActiveSubtask] = useState<string | null>(null);
 const [hoveredTodo, setHoveredTodo] = useState<string | null>(null);
 const [activeTodo, setActiveTodo] = useState<string | null>(null);

 const selectedGoal = goals.find(g => g.id === selectedGoalId) ?? null;
 const isLoading = isLoadingGoals;

 useEffect(() => {
 fetchGoals();
 }, [fetchGoals]);

 useEffect(() => {
 if (!selectedGoalId && goals.length > 0) {
 setSelectedGoalId(goals[0].id);
 }
 }, [goals, selectedGoalId]);

 useEffect(() => {
 if (selectedGoalId) {
 fetchMilestones(selectedGoalId);
 } else {
 setMilestones([]);
 }
 }, [selectedGoalId]);

 const fetchMilestones = async (goalId: string) => {
 try {
 const data = await milestonesApi.getAll();
 const goalMilestones = data.filter(m => m.goal_id === goalId);
 const fullMilestones = await Promise.all(
 goalMilestones.map(milestone =>
 milestonesApi.getById(milestone.id, true, true, true)
 )
 );
 setMilestones(fullMilestones);
 } catch (error) {
 console.error('Failed to fetch milestones:', error);
 }
 };

 // Function to smooth points for a more natural curve
 const smoothPoints = (points: { x: number; y: number }[]) => {
 const smoothed = [...points];
 const iterations = 2;
 
 for (let iter = 0; iter < iterations; iter++) {
 for (let i = 1; i < points.length - 1; i++) {
 smoothed[i] = {
 x: (points[i - 1].x + points[i].x * 2 + points[i + 1].x) / 4,
 y: (points[i - 1].y + points[i].y * 2 + points[i + 1].y) / 4
 };
 }
 }
 
 return smoothed;
 };

 // Function to calculate coordinates
 const calculateCoordinates = (goal: Goal) => {
 const svgWidth = 2000;
 const baseHeight = 500;
 const heightPerMilestone = 100;
 const svgHeight = baseHeight + (milestones.length * heightPerMilestone);
 
 const padding = 60;
 const centerX = svgWidth / 2;
 const startY = padding;
 const endY = svgHeight - padding;
 
 // Define safe vertical bounds for subtasks
 const minY = startY + 100;
 const maxY = endY - 100;
 
 const goalPoints = calculateGoalBezierPoints(centerX, startY, centerX, endY, milestones.length);
 const milestonePositions = goalPoints.slice(1, -1);
 
 const coordinates = {
 goal: {
 start: goalPoints[0],
 end: goalPoints[goalPoints.length - 1],
 points: goalPoints
 },
 milestones: milestones.map((milestone, index) => {
 const milestonePos = milestonePositions[index];
 const tasks = milestone.tasks || [];
 
 // Determine direction for tasks (left or right)
 const isEvenIndex = index % 2 === 0;
 const direction = isEvenIndex ? 1 : -1;
 
 // --- NEW: Precompute all taskY and fix overlaps at minY ---
 const verticalSpacing = 80;
 let taskYs = tasks.map((_, taskIndex) => {
 let y = milestonePos.y - ((tasks.length - 1) * verticalSpacing / 2) + (taskIndex * verticalSpacing);
 return Math.max(y, minY);
 });
 // Find all tasks that are at minY (clamped)
 const minYTasks = taskYs.reduce((arr, y, idx) => {
 if (y === minY) arr.push(idx);
 return arr;
 }, [] as number[]);
 if (minYTasks.length > 1) {
 // Distribute them evenly from minY down
 for (let i = 0; i < minYTasks.length; i++) {
 taskYs[minYTasks[i]] = minY + i * verticalSpacing;
 }
 }
 // --- END NEW ---
 
 return {
 id: milestone.id,
 x: milestonePos.x,
 y: milestonePos.y,
 tasks: tasks.map((task, taskIndex) => {
 // Use precomputed taskY
 const taskY = taskYs[taskIndex];
 const taskX = milestonePos.x + (250 * direction);
 
 // Adjust subtask and todo positioning
 const subtaskHorizontalSpacing = 200;
 const subtaskVerticalSpacing = 40;
 const maxSubtaskOffset = 80;
 const subtaskCount = task.subtasks?.length || 0;
 const todoCount = task.todos?.length || 0;
 let subtaskYs: number[] = [];
 let todosYs: number[] = [];
 // Calculate shift if out of bounds (for symmetric case)
 let shiftY = 0;
 if (taskY >= minY + maxSubtaskOffset && subtaskCount > 0) {
 const tempSubtaskYs = Array.from({ length: subtaskCount }, (_, subtaskIndex) => {
 if (subtaskCount > 1) {
 const offsetPerSubtask = (maxSubtaskOffset * 2) / (subtaskCount - 1);
 return taskY + (-maxSubtaskOffset + (subtaskIndex * offsetPerSubtask));
 } else {
 return taskY;
 }
 });
 const minSubtaskY = Math.min(...tempSubtaskYs);
 const maxSubtaskY = Math.max(...tempSubtaskYs);
 if (minSubtaskY < minY) {
 shiftY = minY - minSubtaskY;
 } else if (maxSubtaskY > maxY) {
 shiftY = maxY - maxSubtaskY;
 }
 }
 // If task is close to the top, arrange first subtask and todo at taskY, rest downward
 if (taskY < minY + maxSubtaskOffset) {
 // Subtasks
 subtaskYs = Array.from({ length: subtaskCount }, (_, i) => {
 if (i === 0 && shiftY < 0) return taskY;
 return taskY + (i === 0 ? 0 : i * subtaskVerticalSpacing) + (shiftY > 0 ? shiftY : 0);
 });
 // Todos
 if (subtaskCount > 0) {
 // First todo at taskY if no subtasks, else after last subtask
 todosYs = Array.from({ length: todoCount }, (_, i) => {
 if (i === 0 && shiftY < 0) return taskY;
 return subtaskYs[subtaskYs.length - 1] + (i + 1) * subtaskVerticalSpacing + (shiftY > 0 ? shiftY : 0);
 });
 } else {
 // No subtasks, todos start at taskY
 todosYs = Array.from({ length: todoCount }, (_, i) => {
 if (i === 0 && shiftY < 0) return taskY;
 return taskY + (i === 0 ? 0 : i * subtaskVerticalSpacing) + (shiftY > 0 ? shiftY : 0);
 });
 }
 } else {
 // Symmetric distribution as before
 if (subtaskCount > 1) {
 const offsetPerSubtask = (maxSubtaskOffset * 2) / (subtaskCount - 1);
 subtaskYs = Array.from({ length: subtaskCount }, (_, subtaskIndex) =>
 taskY + (-maxSubtaskOffset + (subtaskIndex * offsetPerSubtask)) + shiftY
 );
 } else if (subtaskCount === 1) {
 subtaskYs = [taskY + shiftY];
 }
 // Todos below the last subtask
 todosYs = Array.from({ length: todoCount }, (_, i) => {
 const lastSubtaskY = subtaskYs.length > 0 ? Math.max(...subtaskYs) : taskY + shiftY;
 return lastSubtaskY + subtaskVerticalSpacing + i * subtaskVerticalSpacing;
 });
 }
 // No groupShiftY! Task always stays at its calculated position
 return {
 id: task.id,
 x: taskX,
 y: taskY,
 subtasks: (task.subtasks || []).map((subtask, subtaskIndex) => {
 let subtaskY = (subtaskYs[subtaskIndex] ?? taskY) + shiftY;
 return {
 id: subtask.id,
 x: taskX + (subtaskHorizontalSpacing * direction),
 y: subtaskY
 };
 }),
 todos: (task.todos || []).map((todo, todoIndex) => {
 let todoY = (todosYs[todoIndex] ?? (taskY + maxSubtaskOffset + subtaskVerticalSpacing + todoIndex * subtaskVerticalSpacing)) + shiftY;
 // Ensure todos do not go below maxY
 todoY = Math.min(maxY, todoY);
 return {
 id: todo.id,
 x: taskX + (subtaskHorizontalSpacing * direction),
 y: todoY
 };
 })
 };
 })
 };
 })
 };

 return coordinates;
 };

 // Deterministic pseudo-random in [-0.5, 0.5] keyed by index — keeps the curve
 // stable across re-renders so it doesn't jiggle when state updates.
 const seededOffset = (seed: number) => {
 const x = Math.sin(seed * 12.9898) * 43758.5453;
 return (x - Math.floor(x)) - 0.5;
 };

 // Function to calculate Bezier curve control points for the path
 const calculateGoalBezierPoints = (startX: number, startY: number, endX: number, endY: number, milestoneCount: number) => {
 const dx = endX - startX;
 const dy = endY - startY;
 const distance = Math.sqrt(dx * dx + dy * dy);

 const curveIntensity = Math.min(0.3 + (milestoneCount * 0.05), 0.6);

 const points = [];
 const totalPoints = milestoneCount + 2;

 const createWave = (t: number, frequency: number, amplitude: number, phase: number = 0) => {
 return Math.sin(t * Math.PI * frequency + phase) * amplitude;
 };

 for (let i = 0; i < totalPoints; i++) {
 const t = i / (totalPoints - 1);
 const mainWave = createWave(t, 1, distance * curveIntensity * 0.4);
 const secondaryWave = createWave(t, 2, distance * curveIntensity * 0.1, Math.PI / 4);
 const damping = Math.sin(t * Math.PI);
 const offset = (mainWave + secondaryWave) * damping;
 const jitter = seededOffset(i + 1) * distance * 0.02;

 points.push({
 x: startX + dx * t + offset + jitter,
 y: startY + dy * t
 });
 }

 return smoothPoints(points);
 };

 // Function to calculate Bezier curve control points for tasks
 const calculateTaskBezierPoints = (startX: number, startY: number, endX: number, endY: number) => {
 const dx = endX - startX;
 const dy = endY - startY;
 const distance = Math.sqrt(dx * dx + dy * dy);

 // Deterministic key per call site (sum of coords as seed).
 const seed = Math.abs(startX + startY + endX + endY);
 const controlPoint1 = {
 x: startX + dx * 0.3 + seededOffset(seed) * distance * 0.2,
 y: startY + dy * 0.3 + seededOffset(seed + 1) * distance * 0.2
 };
 const controlPoint2 = {
 x: startX + dx * 0.7 + seededOffset(seed + 2) * distance * 0.2,
 y: startY + dy * 0.7 + seededOffset(seed + 3) * distance * 0.2
 };

 return { controlPoint1, controlPoint2 };
 };

 // Function to render the path
 const renderGoalPath = (coordinates: ReturnType<typeof calculateCoordinates>) => {
 const { points } = coordinates.goal;
 
 // Create path from multiple Bezier curves
 let pathData = `M ${points[0].x},${points[0].y}`;
 
 // Use cubic Bezier curves for smoother bends
 for (let i = 0; i < points.length - 1; i++) {
 const current = points[i];
 const next = points[i + 1];
 
 // Calculate control points for smoother curve
 const dx = next.x - current.x;
 const dy = next.y - current.y;
 const distance = Math.sqrt(dx * dx + dy * dy);
 
 // Use longer control points for smoother bends
 const controlLength = distance * 0.5;
 
 const cp1x = current.x + dx * 0.5;
 const cp1y = current.y;
 const cp2x = next.x - dx * 0.5;
 const cp2y = next.y;
 
 pathData += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
 }
 
 return (
 <g>
 <path
 d={pathData}
 fill="none"
 stroke={theme === 'dark' ? 'white' : 'black'}
 strokeWidth="2"
 className="transition-all duration-300"
 style={{
 filter: theme === 'dark' ? 'drop-shadow(0 1px 2px rgba(255,255,255,0.1))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
 }}
 />
 {/* End marker */}
 <g transform={`translate(${points[points.length - 1].x},${points[points.length - 1].y})`}>
 <circle
 r="8"
 fill={theme === 'dark' ? '#1f2937' : 'white'}
 stroke={theme === 'dark' ? 'white' : 'black'}
 strokeWidth="2"
 className="transition-all duration-300"
 style={{
 filter: theme === 'dark' ? 'drop-shadow(0 2px 4px rgba(255,255,255,0.1))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
 }}
 />
 </g>
 </g>
 );
 };

 // Function to render milestone
 const renderMilestone = (milestone: Milestone, x: number, y: number) => {
 const isHovered = hoveredMilestone === milestone.id;
 const isActive = activeMilestone === milestone.id;
 
 const baseSize = 6;
 const padding = 8;
 const width = 160;
 const height = 32;
 
 return (
 <g
 key={milestone.id}
 onMouseEnter={() => setHoveredMilestone(milestone.id)}
 onMouseLeave={() => setHoveredMilestone(null)}
 onClick={() => setActiveMilestone(activeMilestone === milestone.id ? null : milestone.id)}
 className="cursor-pointer"
 >

 <circle
 cx={x}
 cy={y}
 r={baseSize}
 fill="white"
 stroke="black"
 strokeWidth="1"
 className="transition-all duration-300"
 />
 

 <rect
 x={x - width / 2}
 y={y - height / 2}
 width={width}
 height={height}
 rx={6}
 fill="white"
 stroke={isActive ?"green" :"black"}
 strokeWidth={isActive ? 2 : 1}
 className="transition-all duration-300"
 style={{
 filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
 opacity: isHovered || isActive ? 1 : 0
 }}
 />
 
 <foreignObject
 x={x - width / 2 + padding}
 y={y - height / 2 + padding}
 width={width - padding * 2}
 height={height - padding * 2}
 className="pointer-events-none"
 style={{
 opacity: isHovered || isActive ? 1 : 0,
 transition: 'opacity 0.3s'
 }}
 >
 <div className="h-full flex items-center">
 <div className={`font-medium text-sm truncate ${isActive ? 'text-green-600' : 'text-foreground'}`}>
 {milestone.title}
 </div>
 </div>
 </foreignObject>
 </g>
 );
 };

 // Function to render subtask or task
 const renderSubtaskOrTodo = (
 item: Task | Todo,
 x: number,
 y: number,
 parentX: number,
 parentY: number,
 isSubtask: boolean,
 isParentActive: boolean,
 isParentHovered: boolean
 ) => {
 const isHovered = isSubtask ? 
 hoveredSubtask === item.id : 
 hoveredTodo === item.id;
 const isActive = isSubtask ? 
 activeSubtask === item.id : 
 activeTodo === item.id;
 
 const baseSize = 4;
 const padding = 8;
 const width = 160;
 const height = 32;
 
 // Determine direction from parent
 const direction = x > parentX ? 1 : -1;
 
 // Start line from the side if parent is hovered or active
 const lineStartX = (isParentActive || isParentHovered) ? 
 parentX + (width/2 * direction) : 
 parentX;
 const lineStartY = parentY;
 
 // Calculate control points for the line
 const { controlPoint1, controlPoint2 } = calculateTaskBezierPoints(
 lineStartX,
 lineStartY,
 x,
 y
 );
 
 return (
 <g
 key={item.id}
 onMouseEnter={() => isSubtask ? 
 setHoveredSubtask(item.id) : 
 setHoveredTodo(item.id)}
 onMouseLeave={() => isSubtask ? 
 setHoveredSubtask(null) : 
 setHoveredTodo(null)}
 onClick={() => isSubtask ? 
 setActiveSubtask(activeSubtask === item.id ? null : item.id) : 
 setActiveTodo(activeTodo === item.id ? null : item.id)}
 className="cursor-pointer"
 >

 <circle
 cx={x}
 cy={y}
 r={baseSize}
 fill="white"
 stroke={item.status === StatusType.FINISHED ? 'green' : 'gray'}
 strokeWidth="1"
 className="transition-all duration-300"
 />
 

 <path
 d={`M ${lineStartX},${lineStartY} 
 C ${controlPoint1.x},${controlPoint1.y} 
 ${controlPoint2.x},${controlPoint2.y} 
 ${x},${y}`}
 fill="none"
 stroke="gray"
 strokeWidth="1"
 strokeDasharray="2"
 className="transition-all duration-300"
 />
 

 <rect
 x={x - width / 2}
 y={y - height / 2}
 width={width}
 height={height}
 rx={6}
 fill="white"
 stroke={isActive ?"green" :"gray"}
 strokeWidth={isActive ? 2 : 1}
 className="transition-all duration-300"
 style={{
 filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
 opacity: isHovered || isActive ? 1 : 0
 }}
 />
 

 <foreignObject
 x={x - width / 2 + padding}
 y={y - height / 2 + padding}
 width={width - padding * 2}
 height={height - padding * 2}
 className="pointer-events-none"
 style={{
 opacity: isHovered || isActive ? 1 : 0,
 transition: 'opacity 0.3s'
 }}
 >
 <div className="h-full flex items-center">
 <div className={`font-medium text-sm truncate ${isActive ? 'text-green-600' : 'text-foreground'}`}>
 {item.title}
 </div>
 </div>
 </foreignObject>
 </g>
 );
 };

 // Update renderTask function
 const renderTask = (task: Task, x: number, y: number, parentX: number, parentY: number) => {
 const isHovered = hoveredTask === task.id;
 const isActive = activeTask === task.id;
 const showDetails = isHovered || isActive || hoveredMilestone === task.milestone_id;
 
 const baseSize = 6;
 const padding = 8;
 const width = 160;
 const height = 32;
 
 const direction = x > parentX ? 1 : -1;
 
 // Start line from the side if milestone is hovered or active
 const startX = (isHovered || isActive) ? 
 parentX + (width/2 * direction) : 
 parentX;
 const startY = parentY;
 
 const { controlPoint1, controlPoint2 } = calculateTaskBezierPoints(
 startX,
 startY,
 x,
 y
 );
 
 return (
 <g
 key={task.id}
 onMouseEnter={() => setHoveredTask(task.id)}
 onMouseLeave={() => setHoveredTask(null)}
 onClick={() => setActiveTask(activeTask === task.id ? null : task.id)}
 className={`cursor-pointer transition-all duration-300 ${showDetails ? 'opacity-100' : 'opacity-50'}`}
 >

 <circle
 cx={x}
 cy={y}
 r={baseSize}
 fill="white"
 stroke={task.status === StatusType.FINISHED ? 'green' : 'gray'}
 strokeWidth="1"
 className="transition-all duration-300"
 />
 
 <path
 d={`M ${startX},${startY} 
 C ${controlPoint1.x},${controlPoint1.y} 
 ${controlPoint2.x},${controlPoint2.y} 
 ${x},${y}`}
 fill="none"
 stroke="gray"
 strokeWidth="1"
 strokeDasharray="4"
 className="transition-all duration-300"
 />
 
 <rect
 x={x - width / 2}
 y={y - height / 2}
 width={width}
 height={height}
 rx={6}
 fill="white"
 stroke={isActive ?"green" :"gray"}
 strokeWidth={isActive ? 2 : 1}
 className="transition-all duration-300"
 style={{
 filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
 opacity: isHovered || isActive ? 1 : 0
 }}
 />
 
 <foreignObject
 x={x - width / 2 + padding}
 y={y - height / 2 + padding}
 width={width - padding * 2}
 height={height - padding * 2}
 className="pointer-events-none"
 style={{
 opacity: isHovered || isActive ? 1 : 0,
 transition: 'opacity 0.3s'
 }}
 >
 <div className="h-full flex items-center">
 <div className={`font-medium text-sm truncate ${isActive ? 'text-green-600' : 'text-foreground'}`}>
 {task.title}
 </div>
 </div>
 </foreignObject>
 
 {showDetails && (
 <>
 {task.subtasks?.map((subtask, index) => {
 const subtaskX = x + (200 * direction);
 const subtaskY = y + (index - (task.subtasks?.length || 0) / 2) * 40;
 return renderSubtaskOrTodo(
 subtask, 
 subtaskX, 
 subtaskY, 
 x, 
 y, 
 true,
 isActive,
 isHovered
 );
 })}
 {task.todos?.map((todo, index) => {
 const todoX = x + (200 * direction);
 const todoY = y + ((task.subtasks?.length || 0) * 40) + index * 40;
 return renderSubtaskOrTodo(
 todo, 
 todoX, 
 todoY, 
 x, 
 y, 
 false,
 isActive,
 isHovered
 );
 })}
 </>
 )}
 </g>
 );
 };

 if (isLoading) {
 return (
 <div className="flex justify-center items-center h-screen bg-muted dark:bg-card">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border dark:border-border"></div>
 </div>
 );
 }

 if (!selectedGoal) {
 return (
 <div className="min-h-screen bg-muted dark:bg-card flex items-center justify-center px-4">
 <div className="max-w-md w-full text-center bg-card dark:bg-card rounded-xl border border-border dark:border-border p-8 shadow-sm">
 <h1 className="text-2xl font-semibold text-foreground mb-2">
 Nothing to visualize yet
 </h1>
 <p className="text-foreground dark:text-muted-foreground/60 mb-6">
 Create your first goal with a few milestones to see them as a tree.
 </p>
 <a
 href="/goal"
 className="inline-block px-4 py-2 rounded-lg bg-card dark:bg-card text-white hover:bg-card dark:hover:bg-muted transition-colors"
 >
 Create a goal
 </a>
 </div>
 </div>
 );
 }

 const coordinates = calculateCoordinates(selectedGoal);

 return (
 <div className="page">
 <div style={{ maxWidth: 2000, margin: '0 auto' }}>
 <div className="page-head">
 <div className="page-eyebrow">Insights</div>
 <h1 className="page-title">Visualization</h1>
 <p className="page-lede">Goal timelines, dependencies, and progress over time.</p>
 </div>
 <div>
 
 {/* Goal selection component */}
 <div className="relative mx-8">
 <div className="flex items-center space-x-3 overflow-x-auto py-2 pb-6 scrollbar-hide">
 {goals.map((goal) => (
 <button
 key={goal.id}
 onClick={() => setSelectedGoalId(goal.id)}
 className={`
 flex-shrink-0 px-6 py-2.5 rounded-full
 transition-all duration-200
 ${selectedGoal?.id === goal.id 
 ? 'bg-black dark:bg-card text-white dark:text-black shadow-sm' 
 : 'bg-card dark:bg-card text-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-card'
 }
 border border-border dark:border-border
 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2
 min-w-[120px] text-center
 `}
 >
 <span className="text-sm font-medium whitespace-nowrap">
 {goal.title}
 </span>
 </button>
 ))}
 </div>
 </div>

 {/* Goal information */}
 <div className="mt-6 flex items-center space-x-8 text-sm text-foreground dark:text-muted-foreground/60 px-8">
 <div className="flex items-center space-x-2.5">
 <div className="w-2.5 h-2.5 rounded-full bg-black dark:bg-card" />
 <span className="font-medium">Selected: {selectedGoal?.title}</span>
 </div>
 <div className="flex items-center space-x-2.5">
 <div className="w-2.5 h-2.5 rounded-full bg-muted" />
 <span>Milestones: {milestones.length}</span>
 </div>
 <div className="flex items-center space-x-2.5">
 <div className="w-2.5 h-2.5 rounded-full bg-muted" />
 <span>Tasks: {milestones.reduce((acc, m) => acc + (m.tasks?.length || 0), 0)}</span>
 </div>
 </div>
 </div>

 <div className="card">
 <div className="overflow-auto" style={{ maxHeight: '80vh' }}>
 <svg
 ref={svgRef}
 className="w-full"
 viewBox={`0 0 2000 ${500 + (milestones.length * 100)}`}
 preserveAspectRatio="xMidYMid meet"
 >
 {renderGoalPath(coordinates)}

 {coordinates.milestones.map(milestone => {
 const milestoneData = milestones.find(m => m.id === milestone.id);
 if (!milestoneData) {
 console.warn('Milestone not found:', milestone.id);
 return null;
 }
 return (
 <React.Fragment key={milestone.id}>
 {renderMilestone(milestoneData, milestone.x, milestone.y)}
 
 {milestone.tasks.map(task => {
 const taskData = milestoneData.tasks?.find(t => t.id === task.id);
 if (!taskData) {
 console.warn('Task not found:', task.id);
 return null;
 }
 return renderTask(taskData, task.x, task.y, milestone.x, milestone.y);
 })}
 </React.Fragment>
 );
 })}
 </svg>
 </div>
 </div>
 </div>

 <style jsx global>{`
 .scrollbar-hide {
 -ms-overflow-style: none;
 scrollbar-width: none;
 }
 .scrollbar-hide::-webkit-scrollbar {
 display: none;
 }
 `}</style>
 </div>
 );
};

export default GoalVisualization;
