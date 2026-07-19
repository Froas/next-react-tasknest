'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { GoalCreationFlow } from '@/components/goal-flow/GoalCreationFlow';
import { withAuth } from '@/hoc/withAuth';

const GoalBuilderPage: React.FC = () => {
 const params = useParams();
 const goalId = typeof params?.id === 'string'
 ? params.id
 : Array.isArray(params?.id)
 ? params.id[0]
 : undefined;

 return <GoalCreationFlow goalId={goalId} />;
};

export default withAuth(GoalBuilderPage);
