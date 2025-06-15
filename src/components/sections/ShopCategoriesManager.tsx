import React, { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../../firebase/config';
import { ShoppingBag, Plus, Edit, Trash2, Save, X, Loader, ExternalLink, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { FileUpload } from '../common/FileUpload';
import toast from 'react-hot-toast';

interface ShopItem {
  image: string;
  links: string;
  no_of_ratings: string;
  pricing: string;
  ratings: number;
  title: string;
}

interface ShopCategory {
  image: string;
  items: { [key: string]: ShopItem } | ShopItem[];
  title: string;
}

export const ShopCategoriesManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{ categoryIndex: number; itemKey: string } | null>(null);
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState<number | null>(null);

  const [categoryForm, setCategoryForm] = useState<ShopCategory>({
    image: '',
    items: {},
    title: ''
  });

  const [itemForm, setItemForm] = useState<ShopItem>({
    image: '',
    links: '',
    no_of_ratings: '',
    pricing: '',
    ratings: 0,
    title: ''
  });

  useEffect(() => {
    fetchShopCategories();
  }, []);

  const fetchShopCategories = async () => {
    try {
      const categoriesRef = ref(database, 'ShopCategories');
      const snapshot = await get(categoriesRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Convert to array format for easier handling
        const categoriesArray = Array.isArray(data) ? data : Object.values(data);
        setCategories(categoriesArray);
      }
    } catch (error: any) {
      toast.error(`Failed to fetch shop categories: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveCategories = async (updatedCategories: ShopCategory[]) => {
    try {
      const categoriesRef = ref(database, 'ShopCategories');
      await set(categoriesRef, updatedCategories);
      setCategories(updatedCategories);
      toast.success('Store product categories updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update categories: ${error.message}`);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.title.trim()) {
      toast.error('Please enter a category title');
      return;
    }

    const updatedCategories = [...categories, { ...categoryForm, items: {} }];
    await saveCategories(updatedCategories);
    resetCategoryForm();
  };

  const handleEditCategory = (categoryIndex: number) => {
    setEditingCategory(categoryIndex);
    setCategoryForm(categories[categoryIndex]);
  };

  const handleSaveCategoryEdit = async () => {
    if (!categoryForm.title.trim()) {
      toast.error('Category title cannot be empty');
      return;
    }

    const updatedCategories = [...categories];
    updatedCategories[editingCategory!] = {
      ...updatedCategories[editingCategory!],
      title: categoryForm.title,
      image: categoryForm.image
    };
    
    await saveCategories(updatedCategories);
    setEditingCategory(null);
  };

  const handleAddItem = async (categoryIndex: number) => {
    if (!itemForm.title.trim() || !itemForm.links.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedCategories = [...categories];
    const categoryItems = getCategoryItems(updatedCategories[categoryIndex]);
    
    // Generate a new key for the item
    const newItemKey = `item_${Date.now()}`;
    categoryItems[newItemKey] = itemForm;
    updatedCategories[categoryIndex].items = categoryItems;
    
    await saveCategories(updatedCategories);
    resetItemForm();
  };

  const handleEditItem = (categoryIndex: number, itemKey: string) => {
    const categoryItems = getCategoryItems(categories[categoryIndex]);
    setEditingItem({ categoryIndex, itemKey });
    setItemForm(categoryItems[itemKey]);
  };

  const handleSaveItemEdit = async () => {
    if (!itemForm.title.trim() || !itemForm.links.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { categoryIndex, itemKey } = editingItem!;
    const updatedCategories = [...categories];
    const categoryItems = getCategoryItems(updatedCategories[categoryIndex]);
    categoryItems[itemKey] = itemForm;
    updatedCategories[categoryIndex].items = categoryItems;
    
    await saveCategories(updatedCategories);
    setEditingItem(null);
  };

  const handleDeleteCategory = async (categoryIndex: number) => {
    if (window.confirm('Are you sure you want to delete this category and all its items?')) {
      const updatedCategories = categories.filter((_, index) => index !== categoryIndex);
      await saveCategories(updatedCategories);
    }
  };

  const handleDeleteItem = async (categoryIndex: number, itemKey: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      const updatedCategories = [...categories];
      const categoryItems = getCategoryItems(updatedCategories[categoryIndex]);
      delete categoryItems[itemKey];
      updatedCategories[categoryIndex].items = categoryItems;
      await saveCategories(updatedCategories);
    }
  };

  const toggleCategory = (categoryIndex: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryIndex)) {
      newExpanded.delete(categoryIndex);
    } else {
      newExpanded.add(categoryIndex);
    }
    setExpandedCategories(newExpanded);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ image: '', items: {}, title: '' });
    setShowAddCategoryForm(false);
    setEditingCategory(null);
  };

  const resetItemForm = () => {
    setItemForm({ image: '', links: '', no_of_ratings: '', pricing: '', ratings: 0, title: '' });
    setShowAddItemForm(null);
    setEditingItem(null);
  };

  // Helper function to get items as object
  const getCategoryItems = (category: ShopCategory): { [key: string]: ShopItem } => {
    // Handle null or undefined items
    if (!category.items) {
      return {};
    }
    
    if (Array.isArray(category.items)) {
      // Convert array to object
      const itemsObj: { [key: string]: ShopItem } = {};
      category.items.forEach((item, index) => {
        itemsObj[`item_${index}`] = item;
      });
      return itemsObj;
    }
    return category.items as { [key: string]: ShopItem };
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
          <ShoppingBag className="w-6 h-6 text-purple-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Store Product Categories</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            {categories.length} categories
          </div>
          <button
            onClick={() => setShowAddCategoryForm(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </button>
        </div>
      </div>

      {/* Add New Category Form */}
      {showAddCategoryForm && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Store Category</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Title *
              </label>
              <input
                type="text"
                value={categoryForm.title}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Enter category title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Image
              </label>
              <FileUpload
                onUploadComplete={(url) => setCategoryForm(prev => ({ ...prev, image: url }))}
                acceptedTypes="image/*"
                maxSize={3}
                folder="store-categories"
                placeholder="Upload category image"
                currentUrl={categoryForm.image}
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
              onClick={handleAddCategory}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Add Category
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-4">
        {categories.map((category, categoryIndex) => {
          const isExpanded = expandedCategories.has(categoryIndex);
          const categoryItems = getCategoryItems(category);
          
          return (
            <div key={categoryIndex} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Category Header */}
              <div className="p-6 border-b border-gray-200">
                {editingCategory === categoryIndex ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category Title *
                      </label>
                      <input
                        type="text"
                        value={categoryForm.title}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter category title"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category Image
                      </label>
                      <FileUpload
                        onUploadComplete={(url) => setCategoryForm(prev => ({ ...prev, image: url }))}
                        acceptedTypes="image/*"
                        maxSize={3}
                        folder="store-categories"
                        placeholder="Upload category image"
                        currentUrl={categoryForm.image}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveCategoryEdit}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleCategory(categoryIndex)}
                        className="mr-3 p-1 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                      {category.image && (
                        <img
                          src={category.image}
                          alt={category.title}
                          className="w-12 h-12 object-cover rounded-lg mr-4"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{category.title}</h3>
                        <p className="text-sm text-gray-500">
                          {Object.keys(categoryItems).length} products
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAddItemForm(categoryIndex)}
                        className="flex items-center px-3 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </button>
                      <button
                        onClick={() => handleEditCategory(categoryIndex)}
                        className="flex items-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(categoryIndex)}
                        className="flex items-center px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Item Form */}
              {showAddItemForm === categoryIndex && (
                <div className="p-6 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Product</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Title *
                        </label>
                        <input
                          type="text"
                          value={itemForm.title}
                          onChange={(e) => setItemForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter product title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Link *
                        </label>
                        <input
                          type="url"
                          value={itemForm.links}
                          onChange={(e) => setItemForm(prev => ({ ...prev, links: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="https://example.com/product"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Image
                      </label>
                      <FileUpload
                        onUploadComplete={(url) => setItemForm(prev => ({ ...prev, image: url }))}
                        acceptedTypes="image/*"
                        maxSize={3}
                        folder="store-products"
                        placeholder="Upload product image"
                        currentUrl={itemForm.image}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pricing
                        </label>
                        <input
                          type="text"
                          value={itemForm.pricing}
                          onChange={(e) => setItemForm(prev => ({ ...prev, pricing: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="₹ 999.00"
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
                          value={itemForm.ratings}
                          onChange={(e) => setItemForm(prev => ({ ...prev, ratings: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="4.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Number of Ratings
                        </label>
                        <input
                          type="text"
                          value={itemForm.no_of_ratings}
                          onChange={(e) => setItemForm(prev => ({ ...prev, no_of_ratings: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="1,234"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={resetItemForm}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddItem(categoryIndex)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Add Product
                    </button>
                  </div>
                </div>
              )}

              {/* Category Items */}
              {isExpanded && (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(categoryItems).map(([itemKey, item]) => (
                      <div key={itemKey} className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                        {editingItem?.categoryIndex === categoryIndex && editingItem?.itemKey === itemKey ? (
                          <div className="p-4 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Product Title *
                              </label>
                              <input
                                type="text"
                                value={itemForm.title}
                                onChange={(e) => setItemForm(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="Enter product title"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Product Link *
                              </label>
                              <input
                                type="url"
                                value={itemForm.links}
                                onChange={(e) => setItemForm(prev => ({ ...prev, links: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="https://example.com/product"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Product Image
                              </label>
                              <FileUpload
                                onUploadComplete={(url) => setItemForm(prev => ({ ...prev, image: url }))}
                                acceptedTypes="image/*"
                                maxSize={3}
                                folder="store-products"
                                placeholder="Upload product image"
                                currentUrl={itemForm.image}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Pricing
                                </label>
                                <input
                                  type="text"
                                  value={itemForm.pricing}
                                  onChange={(e) => setItemForm(prev => ({ ...prev, pricing: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                  placeholder="₹ 999.00"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Rating
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="5"
                                  step="0.1"
                                  value={itemForm.ratings}
                                  onChange={(e) => setItemForm(prev => ({ ...prev, ratings: parseFloat(e.target.value) || 0 }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                  placeholder="4.5"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Number of Ratings
                              </label>
                              <input
                                type="text"
                                value={itemForm.no_of_ratings}
                                onChange={(e) => setItemForm(prev => ({ ...prev, no_of_ratings: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="1,234"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveItemEdit}
                                className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Save
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {item.image && (
                              <div className="h-48 bg-gray-100">
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            <div className="p-4">
                              <h5 className="font-medium text-gray-900 mb-2 line-clamp-2">{item.title}</h5>
                              <div className="text-sm text-gray-600 mb-2">
                                <div>Price: {item.pricing}</div>
                                <div className="flex items-center">
                                  <span>Rating: </span>
                                  <div className="flex items-center ml-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-3 h-3 ${
                                          i < Math.floor(item.ratings) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                    <span className="ml-1">{item.ratings} ({item.no_of_ratings})</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <a
                                  href={item.links}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm"
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  View Product
                                </a>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditItem(categoryIndex, itemKey)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(categoryIndex, itemKey)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {Object.keys(categoryItems).length === 0 && (
                      <div className="col-span-full text-center py-8 text-gray-500">
                        <p>No products in this category</p>
                        <p className="text-sm">Add your first product above</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No store categories added yet</p>
            <p className="text-sm">Add your first category above</p>
          </div>
        )}
      </div>
    </div>
  );
};