import React, { useState, useEffect } from 'react';
import { ref, get, set, push, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { Layers, Plus, Edit, Trash2, Save, X, Loader, ExternalLink, Image } from 'lucide-react';
import { FileUpload } from '../common/FileUpload';
import toast from 'react-hot-toast';

interface ShopSliderItem {
  click: string;
  image: string;
}

export const ShopSliderManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [sliderItems, setSliderItems] = useState<ShopSliderItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editForm, setEditForm] = useState<ShopSliderItem>({
    click: '',
    image: ''
  });

  useEffect(() => {
    fetchSliderItems();
  }, []);

  const fetchSliderItems = async () => {
    try {
      const sliderRef = ref(database, 'ShopSliderItems');
      const snapshot = await get(sliderRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setSliderItems(Array.isArray(data) ? data : Object.values(data));
      }
    } catch (error: any) {
      toast.error(`Failed to fetch shop slider items: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveSliderItems = async (updatedItems: ShopSliderItem[]) => {
    try {
      const sliderRef = ref(database, 'ShopSliderItems');
      await set(sliderRef, updatedItems);
      setSliderItems(updatedItems);
      toast.success('Shop slider items updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update slider items: ${error.message}`);
    }
  };

  const handleAddItem = async () => {
    if (!editForm.image.trim()) {
      toast.error('Please provide an image URL');
      return;
    }

    const updatedItems = [...sliderItems, editForm];
    await saveSliderItems(updatedItems);
    resetForm();
  };

  const handleEditItem = (index: number) => {
    setEditingIndex(index);
    setEditForm(sliderItems[index]);
  };

  const handleSaveEdit = async () => {
    if (!editForm.image.trim()) {
      toast.error('Please provide an image URL');
      return;
    }

    const updatedItems = sliderItems.map((item, index) =>
      index === editingIndex ? editForm : item
    );
    
    await saveSliderItems(updatedItems);
    setEditingIndex(null);
  };

  const handleDeleteItem = async (index: number) => {
    if (window.confirm('Are you sure you want to delete this slider item?')) {
      const updatedItems = sliderItems.filter((_, i) => i !== index);
      await saveSliderItems(updatedItems);
    }
  };

  const resetForm = () => {
    setEditForm({ click: '', image: '' });
    setShowAddForm(false);
    setEditingIndex(null);
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
          <Layers className="w-6 h-6 text-purple-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Shop Slider Management</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            {sliderItems.length} slider items
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Slider Item
          </button>
        </div>
      </div>

      {/* Add New Item Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Shop Slider Item</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slider Image *
              </label>
              <FileUpload
                onUploadComplete={(url) => setEditForm(prev => ({ ...prev, image: url }))}
                acceptedTypes="image/*"
                maxSize={5}
                folder="shop-slider"
                placeholder="Upload slider image"
                currentUrl={editForm.image}
              />
              <p className="text-xs text-gray-500 mt-1">
                You can also use external image URLs like display ads
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Click URL (Optional)
              </label>
              <input
                type="url"
                value={editForm.click}
                onChange={(e) => setEditForm(prev => ({ ...prev, click: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="https://example.com/affiliate-link"
              />
              <p className="text-xs text-gray-500 mt-1">
                Affiliate link or destination URL when users click the slider
              </p>
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
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Add Item
            </button>
          </div>
        </div>
      )}

      {/* Slider Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sliderItems.map((item, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            {editingIndex === index ? (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slider Image *
                  </label>
                  <FileUpload
                    onUploadComplete={(url) => setEditForm(prev => ({ ...prev, image: url }))}
                    acceptedTypes="image/*"
                    maxSize={5}
                    folder="shop-slider"
                    placeholder="Upload slider image"
                    currentUrl={editForm.image}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Click URL
                  </label>
                  <input
                    type="url"
                    value={editForm.click}
                    onChange={(e) => setEditForm(prev => ({ ...prev, click: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Click URL"
                  />
                </div>
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
                <div className="aspect-video bg-gray-100 relative group">
                  <img
                    src={item.image}
                    alt="Shop slider item"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
                    }}
                  />
                  {item.click && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ExternalLink className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    {item.click ? (
                      <a
                        href={item.click}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm font-medium"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Link
                      </a>
                    ) : (
                      <span className="text-gray-500 text-sm">No click URL</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditItem(index)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteItem(index)}
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

        {sliderItems.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No shop slider items added yet</p>
            <p className="text-sm">Add your first slider item above</p>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {sliderItems.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Slider Preview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sliderItems.map((item, index) => (
              <div key={index} className="relative group">
                <img
                  src={item.image}
                  alt={`Slider ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>
                {item.click && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                    Linked
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};