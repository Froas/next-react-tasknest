"use client";
import { useEffect, useState, useRef } from 'react';
import { Milestone } from '../../../types/types';
import axios from 'axios';
import { withAuth } from '../../hoc/withAuth';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { HTML5toTouch } from 'rdndmb-html5-to-touch'

const MilestonePage: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const { data: session } = useSession();
  const hasFetchedData = useRef(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (session?.accessToken && !hasFetchedData.current) {
      hasFetchedData.current = true;
      axios
        .get('http://localhost:8000/user/milestones', {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })
        .then((response) => {
          setMilestones(response.data);
        })
        .catch((error) => {
          console.error('Error fetching milestones:', error);
        });
    }
  }, [session]);

  const handleMilestoneClick = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
  };

  const handleDeleteMilestone = () => {
    if (selectedMilestone) {
      axios
        .delete(`http://localhost:8000/user/milestones/${selectedMilestone.id}/delete`, {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        })
        .then(() => {
          setMilestones(milestones.filter((milestone) => milestone.id !== selectedMilestone.id));
          setSelectedMilestone(null);
          setIsDeleteConfirmVisible(false);
        })
        .catch((error) => {
          console.error('Error deleting milestone:', error);
        });
    }
  };

  const handleMilestoneUpdate = (updatedMilestone: Milestone) => {
    axios
      .patch(`http://localhost:8000/user/milestones/update`, updatedMilestone, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      })
      .then(() => {
        setMilestones((prevMilestones) =>
          prevMilestones.map((milestone) =>
            milestone.id === updatedMilestone.id ? updatedMilestone : milestone
          )
        );
        setSelectedMilestone(null);
      })
      .catch((error) => {
        console.error('Error updating milestone:', error);
      });
  };

  const filteredMilestones = filterStatus === 'all' ? milestones : milestones.filter((milestone) => milestone.status === filterStatus);

  const statusOptions: Milestone['status'][] = [
    'outstanding', 'started', 'in progress', 'finished', 'closed', 'aborted'
  ];

  const statusColors: { [key: string]: string } = {
    outstanding: 'bg-purple-200',
    started: 'bg-blue-200',
    'in progress': 'bg-yellow-200',
    finished: 'bg-green-200',
    closed: 'bg-gray-200',
    aborted: 'bg-red-200'
  };

  const priorityColors: { [key: string]: string } = {
    low: 'text-green-500',
    medium: 'text-yellow-500',
    high: 'text-red-500'
  };

  const MilestoneCard: React.FC<{ milestone: Milestone; index: number }> = ({ milestone, index }) => {
    const [, drag] = useDrag(() => ({
      type: 'MILESTONE',
      item: { id: milestone.id, index },
    }));

    return (
      <div
        ref={(node) => drag(node as HTMLDivElement | null)}
        className={`bg-white p-4 rounded-lg shadow-md mb-4 cursor-pointer transition-all duration-300 ease-in-out`}
        onClick={() => handleMilestoneClick(milestone)}
      >
        <h3 className="text-lg font-bold">{milestone.title}</h3>
        <p>{milestone.id}</p>
        <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
        <p className={`text-sm ${priorityColors[milestone.priority]} mb-2`}>Priority: {milestone.priority}</p>
        <p className="text-sm text-gray-500">Due Date: {milestone.due_date ? format(new Date(milestone.due_date), 'yyyy-MM-dd') : 'N/A'}</p>
      </div>
    );
  };

  const MilestoneColumn: React.FC<{ status: Milestone['status'] }> = ({ status }) => {
    const [, drop] = useDrop(() => ({
      accept: 'MILESTONE',
      drop: (item: any) => {
        const movedMilestoneIndex = milestones.findIndex((milestone) => milestone.id === item.id);
        if (movedMilestoneIndex !== -1) {
          const updatedMilestone = { ...milestones[movedMilestoneIndex], status };
          handleMilestoneUpdate(updatedMilestone);
        }
      },
    }));

    return (
      <div
        ref={(node) => drop(node as HTMLDivElement)}
        className={`w-1/3 p-4 rounded-lg ${statusColors[status]}`}
      >
        <h2 className="text-xl font-bold mb-4 capitalize">{status}</h2>
        {filteredMilestones
          .filter((milestone) => milestone.status === status)
          .map((milestone, index) => (
            <MilestoneCard key={milestone.id} milestone={milestone} index={index} />
          ))}
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend} options={HTML5toTouch}>
      <div className="container mx-auto px-4 py-8 relative">
        {/* Dropdown for filtering milestones */}
        <div className="flex justify-between mb-4">
          <h1 className="text-2xl font-bold">Milestones</h1>
          <select
            className="border rounded px-4 py-2"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="flex space-x-4">
          {/* Column for each status */}
          {statusOptions.map((status) => (
            <MilestoneColumn key={status} status={status} />
          ))}
        </div>

        {selectedMilestone && (
          <div className="fixed top-0 right-0 w-1/3 h-full bg-gray-100 p-4 shadow-lg overflow-auto transition-transform duration-500 ease-in-out">
            <h2 className="text-2xl font-bold mb-4">Milestone Details</h2>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Title</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={selectedMilestone.title}
                onChange={(e) => setSelectedMilestone({ ...selectedMilestone, title: e.target.value })}
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Description</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                value={selectedMilestone.description}
                onChange={(e) => setSelectedMilestone({ ...selectedMilestone, description: e.target.value })}
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Status</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={selectedMilestone.status}
                onChange={(e) => setSelectedMilestone({ ...selectedMilestone, status: e.target.value as Milestone['status'] })}
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
                value={selectedMilestone.priority}
                onChange={(e) => setSelectedMilestone({ ...selectedMilestone, priority: e.target.value as Milestone['priority'] })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={selectedMilestone.due_date ? format(new Date(selectedMilestone.due_date), 'yyyy-MM-dd') : ''}
                onChange={(e) => setSelectedMilestone({ ...selectedMilestone, due_date: e.target.value })}
              />
            </div>
            <button
              className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={() => selectedMilestone && handleMilestoneUpdate(selectedMilestone)}
            >
              Save
            </button>
            <button
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              onClick={() => setIsDeleteConfirmVisible(true)}
            >
              Delete
            </button>
            <button
              className="mt-4 ml-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              onClick={() => setSelectedMilestone(null)}
            >
              Close
            </button>
          </div>
        )}

        {isDeleteConfirmVisible && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
              <p className="mb-4">Are you sure you want to delete this milestone?</p>
              <div className="flex justify-center">
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mr-2"
                  onClick={handleDeleteMilestone}
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
    </DndProvider>
  );
};

export default withAuth(MilestonePage);
