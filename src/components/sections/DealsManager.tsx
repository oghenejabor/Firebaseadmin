import React, { useState, useEffect } from 'react';
import { ref, get, set, push, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { Tag, Plus, Edit, Trash2, Save, X, Loader, ExternalLink, Percent, Folder, FolderPlus, Image as ImageIcon, Upload } from 'lucide-react';
import { FileUpload } from '../common/FileUpload';
import toast from 'react-hot-toast';

interface Deal {
  id?: string;
  discountedPrice?: string;
  percentOff?: string;
  productDesc: string;
  productImg: string;
  productImages?: string[]; // Array of additional images
  productLink: string;
  productName: string;
  sellingPrice: string;
  category?: string;
  vidID: string;
}

interface DealCategory {
  id?: string;
  name: string;
  description?: string;
  color?: string;
}

export const DealsManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<{ [key: string]: Deal }>({});
  const [categories, setCategories] = useState<{ [key: string]: DealCategory }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedImageIndex, setSelectedImageIndex] = useState<{ [key: string]: number }>({});
  
  const [editForm, setEditForm] = useState<Deal>({
    discountedPrice: '',
    percentOff: '',
    productDesc: '',
    productImg: '',
    productImages: [],
    productLink: '',
    productName: '',
    sellingPrice: '',
    category: '',
    vidID: 'n/a'
  });

  const [categoryForm, setCategoryForm] = useState<DealCategory>({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const categoryColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  useEffect(() => {
    fetchDeals();
    fetchCategories();
  }, []);

  const fetchDeals = async () => {
    try {
      const dealsRef = ref(database, 'Deals');
      const snapshot = await get(dealsRef);
      if (snapshot.exists()) {
        const dealsData = snapshot.val();
        // Ensure backward compatibility - convert old deals to new format
        const processedDeals = Object.fromEntries(
          Object.entries(dealsData).map(([id, deal]: [string, any]) => [
            id,
            {
              ...deal,
              productImages: deal.productImages || []
            }
          ])
        );
        setDeals(processedDeals);
      }
    } catch (error: any) {
      toast.error(`Failed to fetch deals: ${error.message}`);
    }
  };

  const fetchCategories = async () => {
    try {
      const categoriesRef = ref(database, 'DealCategories');
      const snapshot = await get(categoriesRef);
      if (snapshot.exists()) {
        setCategories(snapshot.val());
      }
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeal = async () => {
    if (!editForm.productName.trim() || !editForm.productLink.trim() || !editForm.sellingPrice.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const dealsRef = ref(database, 'Deals');
      const newDealRef = push(dealsRef);
      const dealData = {
        ...editForm,
        id: newDealRef.key
      };
      
      await set(newDealRef, dealData);
      setDeals(prev => ({ ...prev, [newDealRef.key!]: dealData }));
      
      resetForm();
      toast.success('Deal added successfully!');
    } catch (error: any) {
      toast.error(`Failed to add deal: ${error.message}`);
    }
  };

  const handleEditDeal = (id: string) => {
    setEditingId(id);
    setEditForm({
      ...deals[id],
      productImages: deals[id].productImages || []
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.productName.trim() || !editForm.productLink.trim() || !editForm.sellingPrice.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const dealRef = ref(database, `Deals/${editingId}`);
      await set(dealRef, editForm);
      
      setDeals(prev => ({ ...prev, [editingId!]: editForm }));
      setEditingId(null);
      toast.success('Deal updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update deal: ${error.message}`);
    }
  };

  const handleDeleteDeal = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this deal?')) {
      try {
        const dealRef = ref(database, `Deals/${id}`);
        await remove(dealRef);
        
        const updatedDeals = { ...deals };
        delete updatedDeals[id];
        setDeals(updatedDeals);
        
        toast.success('Deal deleted successfully!');
      } catch (error: any) {
        toast.error(`Failed to delete deal: ${error.message}`);
      }
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      const categoriesRef = ref(database, 'DealCategories');
      const newCategoryRef = push(categoriesRef);
      const categoryData = {
        ...categoryForm,
        id: newCategoryRef.key
      };
      
      await set(newCategoryRef, categoryData);
      setCategories(prev => ({ ...prev, [newCategoryRef.key!]: categoryData }));
      
      resetCategoryForm();
      toast.success('Category added successfully!');
    } catch (error: any) {
      toast.error(`Failed to add category: ${error.message}`);
    }
  };

  const handleEditCategory = (id: string) => {
    setEditingCategoryId(id);
    setCategoryForm(categories[id]);
    setShowCategoryForm(true);
  };

  const handleSaveCategoryEdit = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    try {
      const categoryRef = ref(database, `DealCategories/${editingCategoryId}`);
      await set(categoryRef, categoryForm);
      
      setCategories(prev => ({ ...prev, [editingCategoryId!]: categoryForm }));
      setEditingCategoryId(null);
      resetCategoryForm();
      toast.success('Category updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update category: ${error.message}`);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category? Deals in this category will become uncategorized.')) {
      try {
        const categoryRef = ref(database, `DealCategories/${id}`);
        await remove(categoryRef);
        
        const updatedCategories = { ...categories };
        delete updatedCategories[id];
        setCategories(updatedCategories);
        
        toast.success('Category deleted successfully!');
      } catch (error: any) {
        toast.error(`Failed to delete category: ${error.message}`);
      }
    }
  };

  // Image management functions
  const handleAddImage = (url: string) => {
    setEditForm(prev => ({
      ...prev,
      productImages: [...(prev.productImages || []), url]
    }));
  };

  const handleRemoveImage = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      productImages: prev.productImages?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSetMainImage = (imageUrl: string) => {
    setEditForm(prev => ({
      ...prev,
      productImg: imageUrl
    }));
  };

  const getAllImages = (deal: Deal): string[] => {
    const images = [];
    if (deal.productImg) images.push(deal.productImg);
    if (deal.productImages) images.push(...deal.productImages);
    return [...new Set(images)]; // Remove duplicates
  };

  const getSelectedImage = (dealId: string, deal: Deal): string => {
    const allImages = getAllImages(deal);
    const selectedIndex = selectedImageIndex[dealId] || 0;
    return allImages[selectedIndex] || deal.productImg;
  };

  const handleImageSelect = (dealId: string, imageIndex: number) => {
    setSelectedImageIndex(prev => ({
      ...prev,
      [dealId]: imageIndex
    }));
  };

  const resetForm = () => {
    setEditForm({
      discountedPrice: '',
      percentOff: '',
      productDesc: '',
      productImg: '',
      productImages: [],
      productLink: '',
      productName: '',
      sellingPrice: '',
      category: '',
      vidID: 'n/a'
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      color: '#3B82F6'
    });
    setShowCategoryForm(false);
    setEditingCategoryId(null);
  };

  const calculatePercentOff = (sellingPrice: string, discountedPrice: string): string => {
    const selling = parseFloat(sellingPrice.replace(/[^0-9.]/g, ''));
    const discounted = parseFloat(discountedPrice.replace(/[^0-9.]/g, ''));
    
    if (selling > 0 && discounted > 0 && selling > discounted) {
      const percent = ((selling - discounted) / selling) * 100;
      return percent.toFixed(2);
    }
    return '0';
  };

  // Auto-calculate percentage when prices change
  useEffect(() => {
    if (editForm.sellingPrice && editForm.discountedPrice) {
      const calculatedPercent = calculatePercentOff(editForm.sellingPrice, editForm.discountedPrice);
      if (calculatedPercent !== editForm.percentOff) {
        setEditForm(prev => ({ ...prev, percentOff: calculatedPercent }));
      }
    }
  }, [editForm.sellingPrice, editForm.discountedPrice]);

  const getFilteredDeals = () => {
    if (selectedCategory === 'all') {
      return Object.entries(deals);
    }
    if (selectedCategory === 'uncategorized') {
      return Object.entries(deals).filter(([_, deal]) => !deal.category);
    }
    return Object.entries(deals).filter(([_, deal]) => deal.category === selectedCategory);
  };

  const getCategoryName = (categoryId: string) => {
    return categories[categoryId]?.name || 'Unknown Category';
  };

  const getCategoryColor = (categoryId: string) => {
    return categories[categoryId]?.color || '#3B82F6';
  };

  const getDealsCountByCategory = (categoryId: string) => {
    if (categoryId === 'all') {
      return Object.keys(deals).length;
    }
    if (categoryId === 'uncategorized') {
      return Object.values(deals).filter(deal => !deal.category).length;
    }
    return Object.values(deals).filter(deal => deal.category === categoryId).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredDeals = getFilteredDeals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <Tag className="w-6 h-6 text-green-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Deals & Offers</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="text-sm text-gray-500">
            {Object.keys(deals).length} deals • {Object.keys(categories).length} categories
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCategoryForm(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Add Category
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Deal
            </button>
          </div>
        </div>
      </div>

      {/* Category Management Form */}
      {showCategoryForm && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingCategoryId ? 'Edit Category' : 'Add New Category'}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Color
                </label>
                <div className="flex gap-2">
                  {categoryColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryForm(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 ${
                        categoryForm.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={categoryForm.description || ''}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Enter category description"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={resetCategoryForm}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={editingCategoryId ? handleSaveCategoryEdit : handleAddCategory}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              {editingCategoryId ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
          <div className="text-sm text-gray-500">
            Showing {filteredDeals.length} deals
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({getDealsCountByCategory('all')})
          </button>
          <button
            onClick={() => setSelectedCategory('uncategorized')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'uncategorized'
                ? 'bg-gray-100 text-gray-800 border border-gray-300'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            Uncategorized ({getDealsCountByCategory('uncategorized')})
          </button>
          {Object.entries(categories).map(([id, category]) => (
            <div key={id} className="flex items-center gap-1">
              <button
                onClick={() => setSelectedCategory(id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === id
                    ? 'text-white border'
                    : 'text-gray-700 hover:opacity-80'
                }`}
                style={{
                  backgroundColor: selectedCategory === id ? category.color : `${category.color}20`,
                  borderColor: category.color
                }}
              >
                {category.name} ({getDealsCountByCategory(id)})
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEditCategory(id)}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add New Deal Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Add New Deal</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={editForm.productName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, productName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Link *
                </label>
                <input
                  type="url"
                  value={editForm.productLink}
                  onChange={(e) => setEditForm(prev => ({ ...prev, productLink: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="https://example.com/product"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selling Price *
                </label>
                <input
                  type="text"
                  value={editForm.sellingPrice}
                  onChange={(e) => setEditForm(prev => ({ ...prev, sellingPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="$99.99"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discounted Price
                </label>
                <input
                  type="text"
                  value={editForm.discountedPrice || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, discountedPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="$79.99 (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Percent Off (Auto-calculated)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editForm.percentOff || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, percentOff: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-gray-50"
                    placeholder="20.00"
                  />
                  <Percent className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={editForm.category || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select category</option>
                  {Object.entries(categories).map(([id, category]) => (
                    <option key={id} value={id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Main Product Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Main Product Image *
              </label>
              <FileUpload
                onUploadComplete={(url) => setEditForm(prev => ({ ...prev, productImg: url }))}
                acceptedTypes="image/*"
                maxSize={5}
                folder="deals-images"
                placeholder="Upload main product image"
                currentUrl={editForm.productImg}
              />
            </div>

            {/* Additional Product Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Product Images
              </label>
              <div className="space-y-4">
                {/* Current Additional Images */}
                {editForm.productImages && editForm.productImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {editForm.productImages.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Product ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleSetMainImage(imageUrl)}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            Set Main
                          </button>
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add New Image */}
                <FileUpload
                  onUploadComplete={handleAddImage}
                  acceptedTypes="image/*"
                  maxSize={5}
                  folder="deals-images"
                  placeholder="Upload additional product images"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Description
              </label>
              <textarea
                value={editForm.productDesc}
                onChange={(e) => setEditForm(prev => ({ ...prev, productDesc: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Enter detailed product description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video ID (Optional)
              </label>
              <input
                type="text"
                value={editForm.vidID}
                onChange={(e) => setEditForm(prev => ({ ...prev, vidID: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="YouTube video ID or 'n/a'"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleAddDeal}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add Deal
            </button>
          </div>
        </div>
      )}

      {/* Deals List */}
      <div className="space-y-4">
        {filteredDeals.map(([id, deal]) => {
          const allImages = getAllImages(deal);
          const selectedImage = getSelectedImage(id, deal);
          
          return (
            <div key={id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {editingId === id ? (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={editForm.productName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, productName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Product name"
                    />
                    <input
                      type="url"
                      value={editForm.productLink}
                      onChange={(e) => setEditForm(prev => ({ ...prev, productLink: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Product link"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                      type="text"
                      value={editForm.sellingPrice}
                      onChange={(e) => setEditForm(prev => ({ ...prev, sellingPrice: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Selling price"
                    />
                    <input
                      type="text"
                      value={editForm.discountedPrice || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, discountedPrice: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Discounted price"
                    />
                    <input
                      type="text"
                      value={editForm.percentOff || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, percentOff: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-gray-50"
                      placeholder="Percent off"
                    />
                    <select
                      value={editForm.category || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select category</option>
                      {Object.entries(categories).map(([catId, category]) => (
                        <option key={catId} value={catId}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Main Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Main Product Image
                    </label>
                    <FileUpload
                      onUploadComplete={(url) => setEditForm(prev => ({ ...prev, productImg: url }))}
                      acceptedTypes="image/*"
                      maxSize={5}
                      folder="deals-images"
                      placeholder="Upload main product image"
                      currentUrl={editForm.productImg}
                    />
                  </div>

                  {/* Additional Images Management */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Images
                    </label>
                    <div className="space-y-4">
                      {editForm.productImages && editForm.productImages.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {editForm.productImages.map((imageUrl, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={imageUrl}
                                alt={`Product ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-gray-200"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleSetMainImage(imageUrl)}
                                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                >
                                  Main
                                </button>
                                <button
                                  onClick={() => handleRemoveImage(index)}
                                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <FileUpload
                        onUploadComplete={handleAddImage}
                        acceptedTypes="image/*"
                        maxSize={5}
                        folder="deals-images"
                        placeholder="Add more product images"
                      />
                    </div>
                  </div>

                  <textarea
                    value={editForm.productDesc}
                    onChange={(e) => setEditForm(prev => ({ ...prev, productDesc: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Product description"
                  />

                  <input
                    type="text"
                    value={editForm.vidID}
                    onChange={(e) => setEditForm(prev => ({ ...prev, vidID: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Video ID"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="md:flex">
                  {/* Image Section with Thumbnails */}
                  <div className="md:w-80 bg-gray-50">
                    {/* Main Image Display */}
                    <div className="h-64 bg-gray-100 relative">
                      <img
                        src={selectedImage}
                        alt={deal.productName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      {allImages.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                          {(selectedImageIndex[id] || 0) + 1} / {allImages.length}
                        </div>
                      )}
                    </div>
                    
                    {/* Thumbnail Navigation */}
                    {allImages.length > 1 && (
                      <div className="p-3 border-t border-gray-200">
                        <div className="flex gap-2 overflow-x-auto">
                          {allImages.map((imageUrl, index) => (
                            <button
                              key={index}
                              onClick={() => handleImageSelect(id, index)}
                              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                (selectedImageIndex[id] || 0) === index
                                  ? 'border-green-500 ring-2 ring-green-200'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              <img
                                src={imageUrl}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center justify-center mt-2 text-xs text-gray-500">
                          <ImageIcon className="w-3 h-3 mr-1" />
                          {allImages.length} images
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Content Section */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{deal.productName}</h3>
                          {deal.category && (
                            <span
                              className="px-2 py-1 text-xs font-medium text-white rounded-full"
                              style={{ backgroundColor: getCategoryColor(deal.category) }}
                            >
                              {getCategoryName(deal.category)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center">
                            {deal.discountedPrice ? (
                              <>
                                <span className="text-2xl font-bold text-green-600">{deal.discountedPrice}</span>
                                <span className="text-lg text-gray-500 line-through ml-2">{deal.sellingPrice}</span>
                              </>
                            ) : (
                              <span className="text-2xl font-bold text-gray-900">{deal.sellingPrice}</span>
                            )}
                          </div>
                          {deal.percentOff && parseFloat(deal.percentOff) > 0 && (
                            <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                              {deal.percentOff}% OFF
                            </div>
                          )}
                        </div>
                        {deal.productDesc && (
                          <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                            {deal.productDesc.substring(0, 200)}...
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <a
                          href={deal.productLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Deal
                        </a>
                        {deal.vidID && deal.vidID !== 'n/a' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Video: {deal.vidID}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewingId(viewingId === id ? null : id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditDeal(id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDeal(id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {viewingId === id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Full Description:</h4>
                        <p className="text-gray-700 whitespace-pre-wrap text-sm">{deal.productDesc}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredDeals.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No deals found in this category</p>
            <p className="text-sm">
              {selectedCategory === 'all' 
                ? 'Add your first deal above' 
                : 'Try selecting a different category or add deals to this category'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};