import React, { useState, useEffect } from 'react';
import { ref, get, set, push, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { Image, Plus, Edit, Trash2, Save, X, Loader, ExternalLink } from 'lucide-react';
import { FileUpload } from '../common/FileUpload';
import toast from 'react-hot-toast';

interface SlidingImage {
  click: string;
  image: string;
}

export const SlidingImagesManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<{ [key: string]: SlidingImage }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editForm, setEditForm] = useState<SlidingImage>({
    click: '',
    image: ''
  });

  useEffect(() => {
    fetchSlidingImages();
  }, []);

  const fetchSlidingImages = async () => {
    try {
      const imagesRef = ref(database, 'SlidingImages');
      const snapshot = await get(imagesRef);
      if (snapshot.exists()) {
        setImages(snapshot.val());
      }
    } catch (error: any) {
      toast.error(`Failed to fetch sliding images: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = async () => {
    if (!editForm.image.trim()) {
      toast.error('Please provide an image URL');
      return;
    }

    try {
      const imagesRef = ref(database, 'SlidingImages');
      const newImageRef = push(imagesRef);
      await set(newImageRef, editForm);
      
      setImages(prev => ({ ...prev, [newImageRef.key!]: editForm }));
      resetForm();
      toast.success('Sliding image added successfully!');
    } catch (error: any) {
      toast.error(`Failed to add image: ${error.message}`);
    }
  };

  const handleEditImage = (id: string) => {
    setEditingId(id);
    setEditForm(images[id]);
  };

  const handleSaveEdit = async () => {
    if (!editForm.image.trim()) {
      toast.error('Please provide an image URL');
      return;
    }

    try {
      const imageRef = ref(database, `SlidingImages/${editingId}`);
      await set(imageRef, editForm);
      
      setImages(prev => ({ ...prev, [editingId!]: editForm }));
      setEditingId(null);
      toast.success('Image updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update image: ${error.message}`);
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this sliding image?')) {
      try {
        const imageRef = ref(database, `SlidingImages/${id}`);
        await remove(imageRef);
        
        const updatedImages = { ...images };
        delete updatedImages[id];
        setImages(updatedImages);
        
        toast.success('Image deleted successfully!');
      } catch (error: any) {
        toast.error(`Failed to delete image: ${error.message}`);
      }
    }
  };

  const resetForm = () => {
    setEditForm({ click: '', image: '' });
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
          <Image className="w-6 h-6 text-purple-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Sliding Images</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            {Object.keys(images).length} images
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Image
          </button>
        </div>
      </div>

      {/* Add New Image Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Sliding Image</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sliding Image *
              </label>
              <FileUpload
                onUploadComplete={(url) => setEditForm(prev => ({ ...prev, image: url }))}
                acceptedTypes="image/*"
                maxSize={5}
                folder="sliding-images"
                placeholder="Upload sliding image"
                currentUrl={editForm.image}
              />
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
                placeholder="https://example.com"
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
              onClick={handleAddImage}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Add Image
            </button>
          </div>
        </div>
      )}

      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(images).map(([id, imageData]) => (
          <div key={id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            {editingId === id ? (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sliding Image *
                  </label>
                  <FileUpload
                    onUploadComplete={(url) => setEditForm(prev => ({ ...prev, image: url }))}
                    acceptedTypes="image/*"
                    maxSize={5}
                    folder="sliding-images"
                    placeholder="Upload sliding image"
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
                <div className="aspect-video bg-gray-100">
                  <img
                    src={imageData.image}
                    alt="Sliding image"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
                    }}
                  />
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    {imageData.click && (
                      <a
                        href={imageData.click}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Click URL
                      </a>
                    )}
                    {!imageData.click && (
                      <span className="text-gray-500 text-sm">No click URL</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditImage(id)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteImage(id)}
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

        {Object.keys(images).length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No sliding images added yet</p>
            <p className="text-sm">Add your first sliding image above</p>
          </div>
        )}
      </div>
    </div>
  );
};