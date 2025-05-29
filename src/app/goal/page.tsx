
"use client";
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { withAuth } from '../../hoc/withAuth';
import { useSession } from 'next-auth/react';
import GoalForm from '../../components/GoalForm';
import { Goal } from '../../../types/types';
import { format } from 'date-fns';

interface RotatableGoal extends Goal {
  rotation: number;
}

const GoalPage: React.FC = () => {
  const [data, setData] = useState<RotatableGoal[]>([]);
  const { data: session } = useSession();
  const hasFetchedData = useRef(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<RotatableGoal | null>(null);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'circle' | 'list'>('circle'); // Для переключения видов

  useEffect(() => {
    if (session?.accessToken && !hasFetchedData.current) {
      hasFetchedData.current = true;
      axios
        .get('http://localhost:8000/user/goals', {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })
        .then((response) => {
          const goalsWithRotation = response.data.map((goal: Goal, index: number) => ({
            ...goal,
            rotation: (index * 360) / response.data.length,
          }));
          setData(goalsWithRotation);
        })
        .catch((error) => {
          console.error('Ошибка при получении данных:', error);
        });
    }
  }, [session]);

  useEffect(() => {
    if (viewMode === 'circle') {
      const interval = setInterval(() => {
        setRotationAngle((prevAngle) => prevAngle + 1);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [viewMode]);

  const updateGoalRotations = (updatedData: RotatableGoal[]) => {
    const goalsWithUpdatedRotation = updatedData.map((goal, index) => ({
      ...goal,
      rotation: (index * 360) / updatedData.length,
    }));
    setData(goalsWithUpdatedRotation);
  };
  const handleCreateGoal = (
    newGoal: Omit<Goal, 'id' | 'user_id' | 'status' | 'start_datetime' | 'end_datetime'>
  ) => {
    axios
      .post<Goal>('http://localhost:8000/user/goals', newGoal, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      })
      .then((response) => {
        const newGoalWithRotation: RotatableGoal = {
          ...response.data,
          rotation: (data.length * 360) / (data.length + 1),
        };
        updateGoalRotations([...data, newGoalWithRotation]);
        setIsFormVisible(false);
        setSelectedGoal(null);
      })
      .catch((error) => {
        console.error('Ошибка при создании цели:', error);
      });
  };

  const handleGoalClick = (goal: RotatableGoal) => {
    setSelectedGoal(goal);
    setIsFormVisible(false);
  };
  const handleEditGoal = (field: keyof Goal, value: string) => {
    if (selectedGoal) {
      const updatedGoal = { ...selectedGoal, [field]: value };
      setSelectedGoal(updatedGoal);
      setData(data.map((goal) => (goal.id === updatedGoal.id ? updatedGoal : goal)));

      axios
        .patch(`http://localhost:8000/user/goals/update`, updatedGoal, {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        })
        .catch((error) => {
          console.error('Ошибка при обновлении цели:', error);
        });
    }
  };

  const handleDeleteGoal = () => {
    if (selectedGoal) {
      axios
        .delete(`http://localhost:8000/user/goals/${selectedGoal.id}/delete`, {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        })
        .then(() => {
          const updatedData = data.filter((goal) => goal.id !== selectedGoal.id);
          updateGoalRotations(updatedData);
          setSelectedGoal(null);
          setIsDeleteConfirmVisible(false);
        })
        .catch((error) => {
          console.error('Ошибка при удалении цели:', error);
        });
    }
  };

  const statusOptions = [
    "outstanding", "started", "in progress", "finished", "closed", "aborted"
  ];

  const priorityOptions = [
    "low", "medium", "high"
  ];

  const statusColors: { [key: string]: string } = {
    outstanding: 'bg-purple-200',
    started: 'bg-blue-200',
    'in progress': 'bg-yellow-200',
    finished: 'bg-green-200',
    closed: 'bg-gray-200',
    aborted: 'bg-red-200'
  };

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Navbar для переключения видов */}
      <div className="flex justify-center mb-4">
        <button
          className={`px-4 py-2 rounded-l ${viewMode === 'circle' ? 'bg-blue-500' : 'bg-gray-500'} text-white`}
          onClick={() => setViewMode('circle')}
        >
          Circle View
        </button>
        <button
          className={`px-4 py-2 rounded-r ${viewMode === 'list' ? 'bg-blue-500' : 'bg-gray-500'} text-white`}
          onClick={() => setViewMode('list')}
        >
          List View
        </button>
      </div>

      {viewMode === 'circle' ? (
        <div className="circular-goal-wrapper w-[800px] h-[800px] rounded-full mx-auto relative overflow-visible flex items-center justify-center">
          {data.length > 0 ? (
            data.map((goal, index) => (
              <div
                key={goal.id}
                className="goal-item absolute w-44 h-24 rounded-xl bg-blue-500 text-white flex items-center justify-center cursor-pointer text-center"
                style={{
                  transform: `rotate(${90 + goal.rotation + rotationAngle}deg) translate(360px) rotate(-${90 + goal.rotation + rotationAngle}deg)`,
                  transition: 'transform 0.5s linear',
                }}
                onClick={() => handleGoalClick(goal)}
              >
                {goal.title}
              </div>
            ))
          ) : (
            <p>Loading...</p>
          )}
          
        </div>

        ) :(
        <div className="goal-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {data.length > 0 ? (
            data.map((goal) => (
              <div
                key={goal.id}
                className={`goal-card p-6 rounded-lg shadow-md cursor-pointer transition-transform transform hover:scale-105 ${selectedGoal?.id === goal.id ? 'bg-blue-100' : 'bg-white'}`}
                onClick={() => handleGoalClick(goal)}
              >
                <h3 className="text-xl font-bold mb-2">{goal.title}</h3>
                <p className="text-gray-600 mb-2">{goal.description}</p>
                <p className="text-sm text-gray-500">Status: {goal.status}</p>
                <p className="text-sm text-gray-500">Priority: {goal.priority}</p>
                <p className="text-sm text-gray-500">Start Date: {format(new Date(goal.start_datetime), 'yyyy-MM-dd')}</p>
                <p className="text-sm text-gray-500">End Date: {format(new Date(goal.end_datetime), 'yyyy-MM-dd')}</p>
              </div>
            ))
          ) : (
            <p>Loading...</p>
          )}
        </div>
      ) }
      {(isFormVisible || selectedGoal) && (
        <div className="fixed top-0 right-0 w-1/3 h-full bg-gray-100 p-4 shadow-lg overflow-auto transition-transform duration-500 ease-in-out">
          {isFormVisible ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">Create New Goal</h2>
              {/* Goal creation form fields */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) => setSelectedGoal({ ...selectedGoal, title: e.target.value } as RotatableGoal)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) => setSelectedGoal({ ...selectedGoal, description: e.target.value } as RotatableGoal)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Status</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) => setSelectedGoal({ ...selectedGoal, status: e.target.value } as RotatableGoal)}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Priority</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) => setSelectedGoal({ ...selectedGoal, priority: e.target.value } as RotatableGoal)}
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) => setSelectedGoal({ ...selectedGoal, start_datetime: e.target.value } as RotatableGoal)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) => setSelectedGoal({ ...selectedGoal, end_datetime: e.target.value } as RotatableGoal)}
                />
              </div>
              <button
                className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={() => {
                  if (selectedGoal) handleCreateGoal(selectedGoal);
                }}
              >
                Create
              </button>
              <button
                className="mt-4 ml-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                onClick={() => setIsFormVisible(false)}
              >
                Close
              </button>
            </div>
          ) : (
            selectedGoal && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Goal Details</h2>
                {/* Goal details and editing fields */}
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={selectedGoal.title}
                    onChange={(e) => handleEditGoal('title', e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Description</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    value={selectedGoal.description}
                    onChange={(e) => handleEditGoal('description', e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Status</label>
                  <select
                    className={`w-full border rounded px-3 py-2 ${statusColors[selectedGoal.status]}`}
                    value={selectedGoal.status}
                    onChange={(e) => handleEditGoal('status', e.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Priority</label>
                  <select
                    className={`w-full border rounded px-3 py-2 ${selectedGoal.priority === 'high' ? 'bg-red-200' : selectedGoal.priority === 'medium' ? 'bg-yellow-200' : 'bg-green-200'}`}
                    value={selectedGoal.priority}
                    onChange={(e) => handleEditGoal('priority', e.target.value)}
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={format(new Date(selectedGoal.start_datetime), 'yyyy-MM-dd')}
                    onChange={(e) => handleEditGoal('start_datetime', e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    className={`w-full border rounded px-3 py-2 ${new Date(selectedGoal.end_datetime) < new Date() ? 'text-red-500' : ''}`}
                    value={format(new Date(selectedGoal.end_datetime), 'yyyy-MM-dd')}
                    onChange={(e) => handleEditGoal('end_datetime', e.target.value)}
                  />
                </div>
                <button
                  className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  onClick={() => setIsDeleteConfirmVisible(true)}
                >
                  Delete
                </button>
                <button
                  className="mt-4 ml-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  onClick={() => setSelectedGoal(null)}
                >
                  Close
                </button>
              </div>
            )
          )}
        </div>
      )}

      {isDeleteConfirmVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
            <p className="mb-4">Are you sure you want to delete this goal?</p>
            <div className="flex justify-center">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mr-2"
                onClick={handleDeleteGoal}
              >
                Yes
              </button>
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                onClick={() => setIsDeleteConfirmVisible(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withAuth(GoalPage);