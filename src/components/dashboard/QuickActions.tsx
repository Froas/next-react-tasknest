import React, { type CSSProperties } from 'react';

interface QuickActionsProps {
 onAddGoal?: () => void;
 onAddTask?: () => void;
 onAddRoutine?: () => void;
 onAddTodo?: () => void;
 onAddSubtask?: () => void;
 onAddMilestone?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
 onAddGoal,
 onAddTask,
 onAddRoutine,
 onAddTodo,
 onAddSubtask,
 onAddMilestone,
}) => {
 const actions = [
 {
 title: 'Add Goal',
 description: 'Create a new goal with milestones and tasks',
 icon: (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
 </svg>
 ),
 onClick: onAddGoal,
 },
 {
 title: 'Add Milestone',
 description: 'Create a new milestone for a goal',
 icon: (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
 </svg>
 ),
 onClick: onAddMilestone,
 },
 {
 title: 'Add Task',
 description: 'Create a new task for a milestone',
 icon: (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
 </svg>
 ),
 onClick: onAddTask,
 },
 {
 title: 'Add Routine',
 description: 'Create a goal-level recurring routine',
 icon: (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 1l4 4-4 4" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 11V9a4 4 0 014-4h14" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 23l-4-4 4-4" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13v2a4 4 0 01-4 4H3" />
 </svg>
 ),
 onClick: onAddRoutine,
 },
 {
 title: 'Add Todo',
 description: 'Create a recurring todo for a routine or task',
 icon: (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ),
 onClick: onAddTodo,
 },
 {
 title: 'Add Subtask',
 description: 'Create a one-time subtask for a task',
 icon: (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8M8 12h6m-6 5h4M5 5h.01M5 12h.01M5 19h.01" />
 </svg>
 ),
 onClick: onAddSubtask,
 },
 ];

 const actionStyle = (enabled: boolean): CSSProperties => ({
 minHeight: 92,
 padding: 14,
 borderRadius: 'var(--tn-r-md, 8px)',
 border: 'var(--tn-line)',
 background: 'var(--tn-card)',
 color: 'var(--tn-fg)',
 cursor: enabled ? 'pointer' : 'not-allowed',
 opacity: enabled ? 1 : 0.55,
 display: 'flex',
 alignItems: 'flex-start',
 gap: 12,
 textAlign: 'left',
 transition: 'background 160ms ease, transform 160ms ease, box-shadow 160ms ease',
 boxShadow: 'var(--tn-shadow-soft, none)',
 });

 const iconStyle: CSSProperties = {
 width: 42,
 height: 42,
 borderRadius: 'var(--tn-r-md, 8px)',
 background: 'var(--tn-surface-2, var(--tn-hover))',
 color: 'var(--tn-accent)',
 display: 'grid',
 placeItems: 'center',
 flexShrink: 0,
 };

 return (
 <div className="card">
 <h3 className="text-lg font-semibold mb-4 text-foreground">Quick Actions</h3>
 <div
 style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
 gap: 12,
 }}
 >
 {actions.map((action, index) => (
 <button
 key={index}
 onClick={action.onClick}
 className="group"
 style={actionStyle(!!action.onClick)}
 disabled={!action.onClick}
 >
 <div style={iconStyle}>
 {action.icon}
 </div>
 <div style={{ flex: 1, minWidth: 0 }}>
 <h4
 style={{
 fontFamily: 'var(--tn-font-sans)',
 fontWeight: 700,
 fontSize: 16,
 lineHeight: 1.2,
 color: 'var(--tn-fg)',
 marginBottom: 3,
 letterSpacing: 0,
 }}
 >
 {action.title}
 </h4>
 <p
 style={{
 fontFamily: 'var(--tn-font-sans)',
 fontSize: 13,
 color: 'var(--tn-fg-muted)',
 lineHeight: 1.35,
 }}
 >
 {action.description}
 </p>
 </div>
 </button>
 ))}
 </div>
 </div>
 );
};
