import React, { useState, useEffect } from 'react';
import { ref, get, set, push, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { Share2, Plus, Edit, Trash2, Save, X, Loader, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface SocialItem {
  click: string;
  images: string;
  name: string;
}

export const SocialItemsManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [socialItems, setSocialItems] = useState<{ [key: string]: SocialItem }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editForm, setEditForm] = useState<SocialItem>({
    click: '',
    images: '',
    name: ''
  });

  useEffect(() => {
    fetchSocialItems();
  }, []);

  const fetchSocialItems = async () => {
    try {
      const socialRef = ref(database, 'SocialItems');
      const snapshot = await get(socialRef);
      if (snapshot.exists()) {
        setSocialItems(snapshot.val());
      }
    } catch (error: any) {
      toast.error(`Failed to fetch social items: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!editForm.name.trim() || !editForm.click.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const socialRef = ref(database, 'SocialItems');
      const newItemRef = push(socialRef);
      await set(newItemRef, editForm);
      
      setSocialItems(prev => ({ ...prev, [newItemRef.key!]: editForm }));
      resetForm();
      toast.success('Social media platform added successfully!');
    } catch (error: any) {
      toast.error(`Failed to add social platform: ${error.message}`);
    }
  };

  const handleEditItem = (id: string) => {
    setEditingId(id);
    setEditForm(socialItems[id]);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.click.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const itemRef = ref(database, `SocialItems/${editingId}`);
      await set(itemRef, editForm);
      
      setSocialItems(prev => ({ ...prev, [editingId!]: editForm }));
      setEditingId(null);
      toast.success('Social platform updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update social platform: ${error.message}`);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this social media platform?')) {
      try {
        const itemRef = ref(database, `SocialItems/${id}`);
        await remove(itemRef);
        
        const updatedItems = { ...socialItems };
        delete updatedItems[id];
        setSocialItems(updatedItems);
        
        toast.success('Social platform deleted successfully!');
      } catch (error: any) {
        toast.error(`Failed to delete social platform: ${error.message}`);
      }
    }
  };

  const resetForm = () => {
    setEditForm({ click: '', images: '', name: '' });
    setShowAddForm(false);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Share2 className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Social Media Platforms</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            {Object.keys(socialItems).length} platforms
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Platform
          </button>
        </div>
      </div>

      {/* Add New Item Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Social Media Platform</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform Name *
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter platform name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL *
              </label>
              <input
                type="url"
                value={editForm.click}
                onChange={(e) => setEditForm(prev => ({ ...prev, click: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo/Image URL
              </label>
              <input
                type="url"
                value={editForm.images}
                onChange={(e) => setEditForm(prev => ({ ...prev, images: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleAddItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Platform
            </button>
          </div>
        </div>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(socialItems).map(([id, item]) => (
          <div key={id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            {editingId === id ? (
              <div className="p-6 space-y-4">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Platform name"
                />
                <input
                  type="url"
                  value={editForm.click}
                  onChange={(e) => setEditForm(prev => ({ ...prev, click: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Website URL"
                />
                <input
                  type="url"
                  value={editForm.images}
                  onChange={(e) => setEditForm(prev => ({ ...prev, images: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Image URL"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </button>
                  <button
                    onClick={resetForm}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {item.images && (
                  <div className="h-48 bg-gray-100 flex items-center justify-center">
                    <img
                      src={item.images}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{item.name}</h3>
                  
                  <a
                    href={item.click}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm mb-4"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Visit Platform
                  </a>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditItem(id)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteItem(id)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {Object.keys(socialItems).length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Share2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No social media platforms added yet</p>
            <p className="text-sm">Add your first platform above</p>
          </div>
        )}
      </div>
    </div>
  );
};