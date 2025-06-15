import React, { useState, useEffect } from 'react';
import { ref, get, set, push, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { Star, Plus, Edit, Trash2, Save, X, Loader, ExternalLink } from 'lucide-react';
import { FileUpload } from '../common/FileUpload';
import toast from 'react-hot-toast';

interface FeaturedApp {
  id?: string;
  img: string;
  links: string;
  name: string;
  ratings: number;
}

export const FeaturedAppsManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<{ [key: string]: FeaturedApp }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FeaturedApp>({
    img: '',
    links: '',
    name: '',
    ratings: 0
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAppForm, setNewAppForm] = useState<FeaturedApp>({
    img: '',
    links: '',
    name: '',
    ratings: 0
  });

  useEffect(() => {
    fetchFeaturedApps();
  }, []);

  const fetchFeaturedApps = async () => {
    try {
      const appsRef = ref(database, 'FeaturedApps');
      const snapshot = await get(appsRef);
      if (snapshot.exists()) {
        setApps(snapshot.val());
      }
    } catch (error: any) {
      toast.error(`Failed to fetch featured apps: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddApp = async () => {
    if (!newAppForm.name.trim() || !newAppForm.links.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const appsRef = ref(database, 'FeaturedApps');
      const newAppRef = push(appsRef);
      await set(newAppRef, newAppForm);
      
      const updatedApps = { ...apps, [newAppRef.key!]: newAppForm };
      setApps(updatedApps);
      
      setNewAppForm({ img: '', links: '', name: '', ratings: 0 });
      setShowAddForm(false);
      toast.success('Featured app added successfully!');
    } catch (error: any) {
      toast.error(`Failed to add app: ${error.message}`);
    }
  };

  const handleEditApp = (id: string) => {
    setEditingId(id);
    setEditForm(apps[id]);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.links.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const appRef = ref(database, `FeaturedApps/${editingId}`);
      await set(appRef, editForm);
      
      setApps(prev => ({ ...prev, [editingId!]: editForm }));
      setEditingId(null);
      toast.success('App updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update app: ${error.message}`);
    }
  };

  const handleDeleteApp = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this app?')) {
      try {
        const appRef = ref(database, `FeaturedApps/${id}`);
        await remove(appRef);
        
        const updatedApps = { ...apps };
        delete updatedApps[id];
        setApps(updatedApps);
        
        toast.success('App deleted successfully!');
      } catch (error: any) {
        toast.error(`Failed to delete app: ${error.message}`);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ img: '', links: '', name: '', ratings: 0 });
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
          <Star className="w-6 h-6 text-yellow-500 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">App Listing</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            {Object.keys(apps).length} apps
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add App
          </button>
        </div>
      </div>

      {/* Add New App Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Featured App</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App Name *
                </label>
                <input
                  type="text"
                  value={newAppForm.name}
                  onChange={(e) => setNewAppForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter app name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App Link *
                </label>
                <input
                  type="url"
                  value={newAppForm.links}
                  onChange={(e) => setNewAppForm(prev => ({ ...prev, links: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://play.google.com/store/apps/details?id=..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Icon/Image
              </label>
              <FileUpload
                onUploadComplete={(url) => setNewAppForm(prev => ({ ...prev, img: url }))}
                acceptedTypes="image/*"
                maxSize={3}
                folder="app-icons"
                placeholder="Upload app icon or image"
                currentUrl={newAppForm.img}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating (0-5)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={newAppForm.ratings}
                onChange={(e) => setNewAppForm(prev => ({ ...prev, ratings: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="4.5"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleAddApp}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add App
            </button>
          </div>
        </div>
      )}

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(apps).map(([id, app]) => (
          <div key={id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            {editingId === id ? (
              <div className="p-6 space-y-4">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="App name"
                />
                <input
                  type="url"
                  value={editForm.links}
                  onChange={(e) => setEditForm(prev => ({ ...prev, links: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="App link"
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    App Icon/Image
                  </label>
                  <FileUpload
                    onUploadComplete={(url) => setEditForm(prev => ({ ...prev, img: url }))}
                    acceptedTypes="image/*"
                    maxSize={3}
                    folder="app-icons"
                    placeholder="Upload app icon or image"
                    currentUrl={editForm.img}
                  />
                </div>

                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={editForm.ratings}
                  onChange={(e) => setEditForm(prev => ({ ...prev, ratings: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Rating"
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
                    onClick={handleCancelEdit}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {app.img && (
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    <img
                      src={app.img}
                      alt={app.name}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{app.name}</h3>
                  <div className="flex items-center mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(app.ratings) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm text-gray-600">{app.ratings}</span>
                    </div>
                  </div>
                  <a
                    href={app.links}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm mb-4"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View App
                  </a>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditApp(id)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteApp(id)}
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

        {Object.keys(apps).length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No featured apps added yet</p>
            <p className="text-sm">Add your first featured app above</p>
          </div>
        )}
      </div>
    </div>
  );
};