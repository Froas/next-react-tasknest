'use client';

import React from 'react';
import { withAuth } from '@/hoc/withAuth';
import { GoalCreationFlow } from '@/components/goal-flow/GoalCreationFlow';

const NewGoalPage: React.FC = () => {
 return <GoalCreationFlow />;
};

export default withAuth(NewGoalPage);
