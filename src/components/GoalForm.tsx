import React, { useState } from 'react';
import { NewGoal } from '../../types/types';

interface GoalFormProps {
  onCreate: (goal: NewGoal) => void;
}

const GoalForm: React.FC<GoalFormProps> = ({ onCreate }) => {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newGoal: NewGoal = {
      title,
      description,
      priority,
    };
    onCreate(newGoal);
    setTitle('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Создать новую цель</h2>
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Название</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Описание</label>
        <textarea
          className="w-full border rounded px-3 py-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
        Создать
      </button>
    </form>
  );
};

export default GoalForm;