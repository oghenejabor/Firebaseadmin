import React, { useState, useEffect } from 'react';
import { ref, get, set, push, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { Home, Plus, Edit, Trash2, Save, X, Loader, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { FileUpload } from '../common/FileUpload';
import toast from 'react-hot-toast';

interface HomeItem {
  click: string;
  images: string;
  name: string;
}

interface HomeCategory {
  _key?: string;
  image: string;
  items: HomeItem[] | { [key: string]: HomeItem };
  name: string;
}

export const HomeItemsManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ [key: string]: HomeCategory }>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ categoryId: string; itemKey: string } | null>(null);
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState<HomeCategory>({
    image: '',
    items: [],
    name: ''
  });

  const [itemForm, setItemForm] = useState<HomeItem>({
    click: '',
    images: '',
    name: ''
  });

  useEffect(() => {
    fetchHomeItems();
  }, []);

  const fetchHomeItems = async () => {
    try {
      const itemsRef = ref(database, 'HomeItems');
      const snapshot = await get(itemsRef);
      if (snapshot.exists()) {
        setCategories(snapshot.val());
      }
    } catch (error: any) {
      toast.error(`Failed to fetch home items: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveCategories = async (updatedCategories: { [key: string]: HomeCategory }) => {
    try {
      const itemsRef = ref(database, 'HomeItems');
      await set(itemsRef, updatedCategories);
      setCategories(updatedCategories);
      toast.success('Website items updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update items: ${error.message}`);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      const itemsRef = ref(database, 'HomeItems');
      const newCategoryRef = push(itemsRef);
      const categoryData = {
        ...categoryForm,
        items: {}
      };
      
      await set(newCategoryRef, categoryData);
      setCategories(prev => ({ ...prev, [newCategoryRef.key!]: categoryData }));
      
      resetCategoryForm();
      toast.success('Category added successfully!');
    } catch (error: any) {
      toast.error(`Failed to add category: ${error.message}`);
    }
  };

  const handleEditCategory = (categoryId: string) => {
    setEditingCategory(categoryId);
    setCategoryForm(categories[categoryId]);
  };

  const handleSaveCategoryEdit = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    try {
      const updatedCategories = { ...categories };
      updatedCategories[editingCategory!] = {
        ...updatedCategories[editingCategory!],
        name: categoryForm.name,
        image: categoryForm.image
      };
      
      await saveCategories(updatedCategories);
      setEditingCategory(null);
      toast.success('Category updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update category: ${error.message}`);
    }
  };

  const handleAddItem = async (categoryId: string) => {
    if (!itemForm.name.trim() || !itemForm.click.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const itemRef = ref(database, `HomeItems/${categoryId}/items`);
      const newItemRef = push(itemRef);
      await set(newItemRef, itemForm);
      
      const updatedCategories = { ...categories };
      if (!updatedCategories[categoryId].items || Array.isArray(updatedCategories[categoryId].items)) {
        updatedCategories[categoryId].items = {};
      }
      (updatedCategories[categoryId].items as { [key: string]: HomeItem })[newItemRef.key!] = itemForm;
      
      setCategories(updatedCategories);
      resetItemForm();
      toast.success('Item added successfully!');
    } catch (error: any) {
      toast.error(`Failed to add item: ${error.message}`);
    }
  };

  const handleEditItem = (categoryId: string, itemKey: string) => {
    const categoryItems = getCategoryItems(categories[categoryId]);
    setEditingItem({ categoryId, itemKey });
    setItemForm(categoryItems[itemKey]);
  };

  const handleSaveItemEdit = async () => {
    if (!itemForm.name.trim() || !itemForm.click.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { categoryId, itemKey } = editingItem!;
      const itemRef = ref(database, `HomeItems/${categoryId}/items/${itemKey}`);
      await set(itemRef, itemForm);
      
      const updatedCategories = { ...categories };
      const categoryItems = getCategoryItems(updatedCategories[categoryId]);
      categoryItems[itemKey] = itemForm;
      updatedCategories[categoryId].items = categoryItems;
      
      setCategories(updatedCategories);
      setEditingItem(null);
      toast.success('Item updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update item: ${error.message}`);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category and all its items?')) {
      try {
        const categoryRef = ref(database, `HomeItems/${categoryId}`);
        await remove(categoryRef);
        
        const updatedCategories = { ...categories };
        delete updatedCategories[categoryId];
        setCategories(updatedCategories);
        
        toast.success('Category deleted successfully!');
      } catch (error: any) {
        toast.error(`Failed to delete category: ${error.message}`);
      }
    }
  };

  const handleDeleteItem = async (categoryId: string, itemKey: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const itemRef = ref(database, `HomeItems/${categoryId}/items/${itemKey}`);
        await remove(itemRef);
        
        const updatedCategories = { ...categories };
        if (updatedCategories[categoryId].items && typeof updatedCategories[categoryId].items === 'object') {
          delete (updatedCategories[categoryId].items as { [key: string]: HomeItem })[itemKey];
        }
        setCategories(updatedCategories);
        
        toast.success('Item deleted successfully!');
      } catch (error: any) {
        toast.error(`Failed to delete item: ${error.message}`);
      }
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ image: '', items: [], name: '' });
    setShowAddCategoryForm(false);
    setEditingCategory(null);
  };

  const resetItemForm = () => {
    setItemForm({ click: '', images: '', name: '' });
    setShowAddItemForm(null);
    setEditingItem(null);
  };

  // Helper function to get items as object
  const getCategoryItems = (category: HomeCategory): { [key: string]: HomeItem } => {
    // Handle null or undefined items
    if (!category.items) {
      return {};
    }
    
    if (Array.isArray(category.items)) {
      // Convert array to object
      const itemsObj: { [key: string]: HomeItem } = {};
      category.items.forEach((item, index) => {
        itemsObj[`item_${index}`] = item;
      });
      return itemsObj;
    }
    return category.items as { [key: string]: HomeItem };
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
          <Home className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Website Management</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            {Object.keys(categories).length} categories
          </div>
          <button
            onClick={() => setShowAddCategoryForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </button>
        </div>
      </div>

      {/* Add New Category Form */}
      {showAddCategoryForm && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Category</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name *
              </label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter category name"
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
                folder="website-categories"
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Category
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-4">
        {Object.entries(categories).map(([categoryId, category]) => {
          const isExpanded = expandedCategories.has(categoryId);
          const categoryItems = getCategoryItems(category);
          
          return (
            <div key={categoryId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Category Header */}
              <div className="p-6 border-b border-gray-200">
                {editingCategory === categoryId ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter category name"
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
                        folder="website-categories"
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
                        onClick={() => toggleCategory(categoryId)}
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
                          alt={category.name}
                          className="w-12 h-12 object-cover rounded-lg mr-4"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-500">
                          {Object.keys(categoryItems).length} items
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAddItemForm(categoryId)}
                        className="flex items-center px-3 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </button>
                      <button
                        onClick={() => handleEditCategory(categoryId)}
                        className="flex items-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(categoryId)}
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
              {showAddItemForm === categoryId && (
                <div className="p-6 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Item</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Item Name *
                        </label>
                        <input
                          type="text"
                          value={itemForm.name}
                          onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter item name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Click URL *
                        </label>
                        <input
                          type="url"
                          value={itemForm.click}
                          onChange={(e) => setItemForm(prev => ({ ...prev, click: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item Image
                      </label>
                      <FileUpload
                        onUploadComplete={(url) => setItemForm(prev => ({ ...prev, images: url }))}
                        acceptedTypes="image/*"
                        maxSize={3}
                        folder="website-items"
                        placeholder="Upload item image"
                        currentUrl={itemForm.images}
                      />
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
                      onClick={() => handleAddItem(categoryId)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Add Item
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
                        {editingItem?.categoryId === categoryId && editingItem?.itemKey === itemKey ? (
                          <div className="p-4 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Item Name *
                              </label>
                              <input
                                type="text"
                                value={itemForm.name}
                                onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter item name"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Click URL *
                              </label>
                              <input
                                type="url"
                                value={itemForm.click}
                                onChange={(e) => setItemForm(prev => ({ ...prev, click: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="https://example.com"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Item Image
                              </label>
                              <FileUpload
                                onUploadComplete={(url) => setItemForm(prev => ({ ...prev, images: url }))}
                                acceptedTypes="image/*"
                                maxSize={3}
                                folder="website-items"
                                placeholder="Upload item image"
                                currentUrl={itemForm.images}
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
                            {item.images && (
                              <div className="h-32 bg-gray-100">
                                <img
                                  src={item.images}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            <div className="p-4">
                              <h5 className="font-medium text-gray-900 mb-2 line-clamp-2">{item.name}</h5>
                              <div className="flex items-center justify-between">
                                <a
                                  href={item.click}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Visit Link
                                </a>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditItem(categoryId, itemKey)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(categoryId, itemKey)}
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
                        <p>No items in this category</p>
                        <p className="text-sm">Add your first item above</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(categories).length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No categories added yet</p>
            <p className="text-sm">Add your first category above</p>
          </div>
        )}
      </div>
    </div>
  );
};