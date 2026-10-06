import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Modal, Field, Input, Select, useToast } from '../components/UI.jsx';
import { formatPSTDate } from '../utils/dateUtils';

export default function ActivitiesPage({ dispatchOpenModal, lookups }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const { toast } = useToast();

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.activities.list();
      setActivities(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    const handleRefresh = () => fetchActivities();
    window.addEventListener('vktori:refresh', handleRefresh);
    return () => window.removeEventListener('vktori:refresh', handleRefresh);
  }, [fetchActivities]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-800 text-white flex items-center gap-2">
            <span>⚡</span> Activities
          </h2>
          <p className="text-[12px] text-white/50 mt-1">Manage Business Development, Networking, and Non-Case Records.</p>
        </div>
        <button
          onClick={() => { setEditingActivity(null); setIsModalOpen(true); }}
          className="btn btn-primary btn-sm rounded-full"
        >
          + New Activity
        </button>
      </div>

      {(isModalOpen || editingActivity) && (
        <Modal
          title={editingActivity ? "Edit Activity" : "Add New Activity"}
          wide={false}
          onClose={() => { setIsModalOpen(false); setEditingActivity(null); }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const title = formData.get('title');
              const type = formData.get('type');
              if (title && type) {
                try {
                  if (editingActivity) {
                    await api.activities.update(editingActivity.id, { title, type });
                    toast('Activity updated successfully!', 'success');
                  } else {
                    await api.activities.create({ title, type, description: '' });
                    toast('Activity created successfully!', 'success');
                  }
                  setIsModalOpen(false);
                  setEditingActivity(null);
                  fetchActivities();
                } catch (err) {
                  toast(`Error ${editingActivity ? 'updating' : 'creating'} activity`, 'error');
                }
              }
            }}
          >
            <div className="mb-4">
              <Field label="Activity Title" required>
                <Input name="title" defaultValue={editingActivity?.title || ''} placeholder="E.g., Q3 Networking Event" required />
              </Field>
            </div>
            <div className="mb-6">
              <Field label="Activity Type" required>
                <Select name="type" defaultValue={editingActivity?.type || ''} required>
                  <option value="Business Development">Business Development</option>
                  <option value="Networking">Networking</option>
                  <option value="Internal Meeting">Internal Meeting</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Referral">Referral</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setEditingActivity(null); }}
                className="btn btn-secondary px-6"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary px-6">
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-white/50">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center text-white/50">No activities found.</div>
        ) : (
          <table className="w-full text-left text-[13px] whitespace-nowrap">
            <thead className="bg-white/[0.02] border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-700 text-white/60">Title</th>
                <th className="px-6 py-4 font-700 text-white/60">Type</th>
                <th className="px-6 py-4 font-700 text-white/60">Status</th>
                <th className="px-6 py-4 font-700 text-white/60">Date Created</th>
                <th className="px-6 py-4 font-700 text-white/60 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activities.map((a) => (
                <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-600 text-white">{a.title}</span>
                  </td>
                  <td className="px-6 py-4 text-white/70">{a.type}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-white/10 rounded-md text-[11px] font-600 text-white">
                      {a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/50">
                    {formatPSTDate(a.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 transition-opacity">
                      <button
                        onClick={() => setEditingActivity(a)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                        title="Edit Activity"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        onClick={() => setActivityToDelete(a)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-white/60 hover:text-red-400 transition-colors"
                        title="Delete Activity"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {activityToDelete && (
        <Modal
          title="Delete Activity"
          wide={false}
          onClose={() => setActivityToDelete(null)}
        >
          <div className="text-white/80 mb-6">
            Are you sure you want to delete this activity? This action cannot be undone.
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setActivityToDelete(null)}
              className="btn btn-secondary px-6"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await api.activities.remove(activityToDelete.id);
                  toast('Activity deleted successfully!', 'success');
                  setActivityToDelete(null);
                  fetchActivities();
                } catch (err) {
                  toast('Error deleting activity', 'error');
                }
              }}
              className="btn bg-red-600 hover:bg-red-500 text-white px-6"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
