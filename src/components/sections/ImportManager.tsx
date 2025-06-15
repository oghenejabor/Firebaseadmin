import React, { useState, useRef } from 'react';
import { ref, get, set, push } from 'firebase/database';
import { database } from '../../firebase/config';
import { 
  Download, 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Loader, 
  X,
  Eye,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  Filter,
  ShoppingBag,
  Home,
  Target,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ProductData {
  Name: string;
  ImageUrl: string;
  OriginalPrice: string;
  Currency: string;
  ClickUrl: string;
  // Additional fields that might be in the CSV
  [key: string]: string;
}

interface ParsedStoreProduct {
  image: string;
  links: string;
  no_of_ratings: string;
  pricing: string;
  ratings: number;
  title: string;
  isDuplicate?: boolean;
  duplicateSource?: string;
}

interface ParsedWebsiteItem {
  click: string;
  images: string;
  name: string;
  isDuplicate?: boolean;
  duplicateSource?: string;
}

interface ShopCategory {
  image: string;
  items: { [key: string]: ParsedStoreProduct };
  title: string;
}

interface HomeCategory {
  image: string;
  items: { [key: string]: ParsedWebsiteItem };
  name: string;
}

interface DuplicateCheckResult {
  totalProducts: number;
  duplicates: number;
  newProducts: number;
  duplicateDetails: Array<{
    productName: string;
    clickUrl: string;
    foundInCategory: string;
  }>;
}

type ImportDestination = 'store-products' | 'website-management';

export const ImportManager: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [parsedData, setParsedData] = useState<ProductData[]>([]);
  const [previewData, setPreviewData] = useState<(ParsedStoreProduct | ParsedWebsiteItem)[]>([]);
  const [importDestination, setImportDestination] = useState<ImportDestination>('store-products');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [existingStoreCategories, setExistingStoreCategories] = useState<ShopCategory[]>([]);
  const [existingWebsiteCategories, setExistingWebsiteCategories] = useState<{ [key: string]: HomeCategory }>({});
  const [showPreview, setShowPreview] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<DuplicateCheckResult | null>(null);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetchExistingCategories();
  }, [importDestination]);

  const fetchExistingCategories = async () => {
    try {
      if (importDestination === 'store-products') {
        const categoriesRef = ref(database, 'ShopCategories');
        const snapshot = await get(categoriesRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const categoriesArray = Array.isArray(data) ? data : Object.values(data);
          setExistingStoreCategories(categoriesArray);
        }
      } else {
        const categoriesRef = ref(database, 'HomeItems');
        const snapshot = await get(categoriesRef);
        if (snapshot.exists()) {
          setExistingWebsiteCategories(snapshot.val());
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const checkForDuplicates = async (products: (ParsedStoreProduct | ParsedWebsiteItem)[]): Promise<DuplicateCheckResult> => {
    setCheckingDuplicates(true);
    
    try {
      const existingUrls = new Map<string, string>();
      
      if (importDestination === 'store-products') {
        existingStoreCategories.forEach(category => {
          if (category.items) {
            Object.values(category.items).forEach(item => {
              if (item.links) {
                const normalizedUrl = item.links.toLowerCase().replace(/\/$/, '');
                existingUrls.set(normalizedUrl, category.title);
              }
            });
          }
        });
      } else {
        Object.values(existingWebsiteCategories).forEach(category => {
          if (category.items) {
            const items = Array.isArray(category.items) ? category.items : Object.values(category.items);
            items.forEach((item: any) => {
              if (item.click) {
                const normalizedUrl = item.click.toLowerCase().replace(/\/$/, '');
                existingUrls.set(normalizedUrl, category.name);
              }
            });
          }
        });
      }

      const duplicateDetails: Array<{
        productName: string;
        clickUrl: string;
        foundInCategory: string;
      }> = [];

      const checkedProducts = products.map(product => {
        const url = importDestination === 'store-products' 
          ? (product as ParsedStoreProduct).links 
          : (product as ParsedWebsiteItem).click;
        const name = importDestination === 'store-products'
          ? (product as ParsedStoreProduct).title
          : (product as ParsedWebsiteItem).name;
        
        const normalizedUrl = url.toLowerCase().replace(/\/$/, '');
        const foundInCategory = existingUrls.get(normalizedUrl);
        
        if (foundInCategory) {
          duplicateDetails.push({
            productName: name,
            clickUrl: url,
            foundInCategory
          });
          
          return {
            ...product,
            isDuplicate: true,
            duplicateSource: foundInCategory
          };
        }
        
        return { ...product, isDuplicate: false };
      });

      const result: DuplicateCheckResult = {
        totalProducts: products.length,
        duplicates: duplicateDetails.length,
        newProducts: products.length - duplicateDetails.length,
        duplicateDetails
      };

      setPreviewData(checkedProducts);
      setDuplicateCheckResult(result);
      
      return result;
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const fileType = selectedFile.type;
      const fileName = selectedFile.name.toLowerCase();
      
      if (fileType === 'text/csv' || fileName.endsWith('.csv') || 
          fileType === 'application/vnd.ms-excel' || 
          fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setFile(selectedFile);
        parseFile(selectedFile);
      } else {
        toast.error('Please select a CSV or Excel file');
        setFile(null);
      }
    }
  };

  const parseFile = async (file: File) => {
    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('File must contain at least a header row and one data row');
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      const data: ProductData[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
          const row: ProductData = {};
          headers.forEach((header, index) => {
            row[header] = values[index]?.replace(/"/g, '').trim() || '';
          });
          data.push(row);
        }
      }

      setParsedData(data);
      
      const preview = data.map(item => convertToFormat(item));
      const duplicateResult = await checkForDuplicates(preview);
      
      setShowPreview(true);
      
      toast.success(
        `Successfully parsed ${data.length} items. Found ${duplicateResult.duplicates} duplicates.`
      );
      
      if (duplicateResult.duplicates > 0) {
        toast.warning(
          `${duplicateResult.duplicates} items already exist in the database and will be skipped by default.`,
          { duration: 5000 }
        );
      }
    } catch (error: any) {
      toast.error(`Failed to parse file: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  const convertToFormat = (item: ProductData): ParsedStoreProduct | ParsedWebsiteItem => {
    if (importDestination === 'store-products') {
      return {
        image: item.ImageUrl || item.Image || '',
        links: item.ClickUrl || item.Link || item.Url || '',
        no_of_ratings: item.Ratings || item.Reviews || '',
        pricing: `${item.Currency || 'USD'} ${item.OriginalPrice || item.Price || '0'}`,
        ratings: parseFloat(item.Rating || '0') || 0,
        title: item.Name || item.Title || item.ProductName || 'Untitled Product'
      } as ParsedStoreProduct;
    } else {
      return {
        click: item.ClickUrl || item.Link || item.Url || '',
        images: item.ImageUrl || item.Image || '',
        name: item.Name || item.Title || item.ProductName || 'Untitled Item'
      } as ParsedWebsiteItem;
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('No data to import');
      return;
    }

    if (!selectedCategory && !newCategoryName.trim()) {
      toast.error('Please select an existing category or enter a new category name');
      return;
    }

    const itemsToImport = skipDuplicates 
      ? previewData.filter(item => !item.isDuplicate)
      : previewData;

    if (itemsToImport.length === 0) {
      toast.error('No items to import after filtering duplicates');
      return;
    }

    setUploading(true);
    try {
      if (importDestination === 'store-products') {
        await importToStoreProducts(itemsToImport as ParsedStoreProduct[]);
      } else {
        await importToWebsiteManagement(itemsToImport as ParsedWebsiteItem[]);
      }
      
      const skippedCount = previewData.length - itemsToImport.length;
      const importMessage = skippedCount > 0 
        ? `Successfully imported ${itemsToImport.length} items (${skippedCount} duplicates skipped)`
        : `Successfully imported ${itemsToImport.length} items`;
      
      toast.success(importMessage);
      
      resetForm();
      await fetchExistingCategories();
      
    } catch (error: any) {
      toast.error(`Failed to import items: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const importToStoreProducts = async (products: ParsedStoreProduct[]) => {
    const categoriesRef = ref(database, 'ShopCategories');
    let updatedCategories = [...existingStoreCategories];
    
    let targetCategoryIndex = -1;
    
    if (newCategoryName.trim()) {
      const newCategory: ShopCategory = {
        image: '',
        items: {},
        title: newCategoryName.trim()
      };
      updatedCategories.push(newCategory);
      targetCategoryIndex = updatedCategories.length - 1;
    } else {
      targetCategoryIndex = parseInt(selectedCategory);
    }

    if (targetCategoryIndex === -1 || !updatedCategories[targetCategoryIndex]) {
      throw new Error('Invalid category selection');
    }

    const categoryItems = updatedCategories[targetCategoryIndex].items || {};
    
    products.forEach((product, index) => {
      const itemKey = `item_${Date.now()}_${index}`;
      const { isDuplicate, duplicateSource, ...cleanProduct } = product;
      categoryItems[itemKey] = cleanProduct;
    });

    updatedCategories[targetCategoryIndex].items = categoryItems;
    await set(categoriesRef, updatedCategories);
  };

  const importToWebsiteManagement = async (items: ParsedWebsiteItem[]) => {
    const categoriesRef = ref(database, 'HomeItems');
    let updatedCategories = { ...existingWebsiteCategories };
    
    let targetCategoryId = selectedCategory;
    
    if (newCategoryName.trim()) {
      const newCategoryRef = push(categoriesRef);
      targetCategoryId = newCategoryRef.key!;
      updatedCategories[targetCategoryId] = {
        image: '',
        items: {},
        name: newCategoryName.trim()
      };
    }

    if (!targetCategoryId || !updatedCategories[targetCategoryId]) {
      throw new Error('Invalid category selection');
    }

    const categoryItems = updatedCategories[targetCategoryId].items || {};
    
    items.forEach((item, index) => {
      const itemKey = `item_${Date.now()}_${index}`;
      const { isDuplicate, duplicateSource, ...cleanItem } = item;
      (categoryItems as any)[itemKey] = cleanItem;
    });

    updatedCategories[targetCategoryId].items = categoryItems;
    await set(categoriesRef, updatedCategories);
  };

  const removeFile = () => {
    setFile(null);
    setParsedData([]);
    setPreviewData([]);
    setShowPreview(false);
    setDuplicateCheckResult(null);
    setShowDuplicatesOnly(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePreviewItem = (index: number) => {
    const newPreviewData = previewData.filter((_, i) => i !== index);
    setPreviewData(newPreviewData);
    
    if (duplicateCheckResult) {
      const duplicates = newPreviewData.filter(p => p.isDuplicate).length;
      setDuplicateCheckResult({
        ...duplicateCheckResult,
        totalProducts: newPreviewData.length,
        duplicates,
        newProducts: newPreviewData.length - duplicates
      });
    }
  };

  const resetForm = () => {
    setFile(null);
    setParsedData([]);
    setPreviewData([]);
    setShowPreview(false);
    setSelectedCategory('');
    setNewCategoryName('');
    setDuplicateCheckResult(null);
    setShowDuplicatesOnly(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFilteredPreviewData = () => {
    if (!showDuplicatesOnly) return previewData;
    return previewData.filter(item => item.isDuplicate);
  };

  const filteredData = getFilteredPreviewData();

  const getRequiredFields = () => {
    if (importDestination === 'store-products') {
      return ['Name', 'ImageUrl', 'OriginalPrice', 'Currency', 'ClickUrl'];
    } else {
      return ['Name', 'ClickUrl', 'ImageUrl'];
    }
  };

  const getOptionalFields = () => {
    if (importDestination === 'store-products') {
      return ['Rating', 'Reviews', 'Ratings'];
    } else {
      return [];
    }
  };

  const getSampleFormat = () => {
    if (importDestination === 'store-products') {
      return `Name,ImageUrl,OriginalPrice,Currency,ClickUrl,Rating
"Lenovo ThinkCentre M90a","https://example.com/image.png","61801.00","INR","https://example.com/product","4.5"
"Lenovo ThinkBook 16","https://example.com/image2.png","79800.00","INR","https://example.com/product2","4.2"`;
    } else {
      return `Name,ClickUrl,ImageUrl
"Amazon","https://amazon.com","https://example.com/amazon-logo.png"
"Flipkart","https://flipkart.com","https://example.com/flipkart-logo.png"`;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Download className="w-6 h-6 text-green-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Import Configuration</h2>
        </div>
      </div>

      {/* Import Destination Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          1. Select Import Destination
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => {
              setImportDestination('store-products');
              resetForm();
            }}
            className={`p-6 border-2 rounded-lg text-left transition-all ${
              importDestination === 'store-products'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center mb-3">
              <ShoppingBag className="w-6 h-6 text-blue-600 mr-3" />
              <h4 className="text-lg font-semibold text-gray-900">Store Products</h4>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              Import products to your store catalog with full product details
            </p>
            <div className="text-xs text-gray-500">
              <strong>Fields:</strong> Title, Price, Currency, Images, Ratings, Links
            </div>
          </button>

          <button
            onClick={() => {
              setImportDestination('website-management');
              resetForm();
            }}
            className={`p-6 border-2 rounded-lg text-left transition-all ${
              importDestination === 'website-management'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center mb-3">
              <Home className="w-6 h-6 text-green-600 mr-3" />
              <h4 className="text-lg font-semibold text-gray-900">Website Management</h4>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              Import website links and services for easy access
            </p>
            <div className="text-xs text-gray-500">
              <strong>Fields:</strong> Title, URL, Image
            </div>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">
              {importDestination === 'store-products' ? 'Store Products' : 'Website Management'} Import Instructions
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Supported formats: CSV (.csv), Excel (.xlsx, .xls)</li>
              <li>Required columns: {getRequiredFields().join(', ')}</li>
              {getOptionalFields().length > 0 && (
                <li>Optional columns: {getOptionalFields().join(', ')}</li>
              )}
              <li><strong>Duplicate Detection:</strong> Items with existing URLs will be automatically detected</li>
              <li>Items will be added to {importDestination === 'store-products' ? 'ShopCategories' : 'HomeItems'} in Firebase</li>
            </ul>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Upload className="w-5 h-5 mr-2" />
          2. Upload Data File
        </h3>
        
        {!file ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-900 mb-2">Upload CSV or Excel File</p>
            <p className="text-gray-600 mb-4">Drag and drop or click to select your data file</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">
                    {(file.size / 1024).toFixed(2)} KB • {parsedData.length} items
                    {checkingDuplicates && (
                      <span className="ml-2 text-blue-600">
                        <Loader className="w-4 h-4 inline animate-spin mr-1" />
                        Checking duplicates...
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Duplicate Check Results */}
      {duplicateCheckResult && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Duplicate Check Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-blue-900">{duplicateCheckResult.totalProducts}</div>
                  <div className="text-blue-700">Total Items</div>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-red-900">{duplicateCheckResult.duplicates}</div>
                  <div className="text-red-700">Duplicates Found</div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-green-900">{duplicateCheckResult.newProducts}</div>
                  <div className="text-green-700">New Items</div>
                </div>
              </div>
            </div>
          </div>

          {/* Import Options */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-3">Import Options</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="duplicateHandling"
                  checked={skipDuplicates}
                  onChange={() => setSkipDuplicates(true)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Skip duplicates (Import only {duplicateCheckResult.newProducts} new items)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="duplicateHandling"
                  checked={!skipDuplicates}
                  onChange={() => setSkipDuplicates(false)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Import all items (Including {duplicateCheckResult.duplicates} duplicates)
                </span>
              </label>
            </div>
          </div>

          {/* Duplicate Details */}
          {duplicateCheckResult.duplicates > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-3">Duplicate Items Found</h4>
              <div className="max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {duplicateCheckResult.duplicateDetails.map((duplicate, index) => (
                    <div key={index} className="text-sm text-yellow-800 bg-yellow-100 rounded p-2">
                      <div className="font-medium">{duplicate.productName}</div>
                      <div className="text-xs text-yellow-700">
                        URL: {duplicate.clickUrl}
                      </div>
                      <div className="text-xs text-yellow-600">
                        Found in category: {duplicate.foundInCategory}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Selection */}
      {showPreview && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            3. Select Category
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Existing Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  if (e.target.value) setNewCategoryName('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select existing category...</option>
                {importDestination === 'store-products' 
                  ? existingStoreCategories.map((category, index) => (
                      <option key={index} value={index.toString()}>
                        {category.title} ({Object.keys(category.items || {}).length} items)
                      </option>
                    ))
                  : Object.entries(existingWebsiteCategories).map(([id, category]) => (
                      <option key={id} value={id}>
                        {category.name} ({Object.keys(category.items || {}).length} items)
                      </option>
                    ))
                }
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Create New Category
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  if (e.target.value) setSelectedCategory('');
                }}
                placeholder="Enter new category name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {showPreview && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Preview Items ({filteredData.length})
              </h3>
              
              {duplicateCheckResult && duplicateCheckResult.duplicates > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                    className={`flex items-center px-3 py-1 rounded-lg text-sm transition-colors ${
                      showDuplicatesOnly
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Filter className="w-4 h-4 mr-1" />
                    {showDuplicatesOnly ? 'Show All' : 'Show Duplicates Only'}
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={handleImport}
              disabled={uploading || (!selectedCategory && !newCategoryName.trim())}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {uploading ? 'Importing...' : `Import ${skipDuplicates ? duplicateCheckResult?.newProducts || 0 : previewData.length} Items`}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredData.map((item, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-4 relative ${
                  item.isDuplicate 
                    ? 'border-red-200 bg-red-50' 
                    : 'border-gray-200'
                }`}
              >
                <button
                  onClick={() => removePreviewItem(index)}
                  className="absolute top-2 right-2 p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                {item.isDuplicate && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                    Duplicate
                  </div>
                )}
                
                {/* Image Preview */}
                {((importDestination === 'store-products' && (item as ParsedStoreProduct).image) ||
                  (importDestination === 'website-management' && (item as ParsedWebsiteItem).images)) && (
                  <img
                    src={importDestination === 'store-products' 
                      ? (item as ParsedStoreProduct).image 
                      : (item as ParsedWebsiteItem).images}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded mb-3"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                
                <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
                  {importDestination === 'store-products' 
                    ? (item as ParsedStoreProduct).title 
                    : (item as ParsedWebsiteItem).name}
                </h4>
                
                <div className="text-sm text-gray-600 space-y-1">
                  {importDestination === 'store-products' ? (
                    <>
                      <div>Price: {(item as ParsedStoreProduct).pricing}</div>
                      <div>Rating: {(item as ParsedStoreProduct).ratings}</div>
                      {(item as ParsedStoreProduct).no_of_ratings && (
                        <div>Reviews: {(item as ParsedStoreProduct).no_of_ratings}</div>
                      )}
                    </>
                  ) : (
                    <div>URL: {(item as ParsedWebsiteItem).click}</div>
                  )}
                  
                  {item.isDuplicate && (
                    <div className="text-red-600 text-xs font-medium">
                      Found in: {item.duplicateSource}
                    </div>
                  )}
                </div>
                
                {/* View Link */}
                <a
                  href={importDestination === 'store-products' 
                    ? (item as ParsedStoreProduct).links 
                    : (item as ParsedWebsiteItem).click}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs mt-2"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View Link
                </a>
              </div>
            ))}
          </div>

          {filteredData.length === 0 && showDuplicatesOnly && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p>No duplicate items found!</p>
              <p className="text-sm">All items have unique URLs.</p>
            </div>
          )}
        </div>
      )}

      {/* Sample Format */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Sample CSV Format for {importDestination === 'store-products' ? 'Store Products' : 'Website Management'}
        </h3>
        <div className="bg-white rounded border p-4 overflow-x-auto">
          <pre className="text-sm text-gray-700">
            {getSampleFormat()}
          </pre>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Copy this format for your CSV file. Additional columns will be automatically detected.
        </p>
      </div>

      {/* Workflow Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-green-800">
            <p className="font-medium mb-1">Import Workflow</p>
            <ol className="list-decimal list-inside space-y-1 text-green-700">
              <li><strong>Select Destination:</strong> Choose between Store Products or Website Management</li>
              <li><strong>Upload File:</strong> CSV/Excel with required columns based on destination</li>
              <li><strong>Review Duplicates:</strong> System automatically detects existing items</li>
              <li><strong>Choose Category:</strong> Select existing or create new category</li>
              <li><strong>Import:</strong> Items are added to Firebase with proper structure</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};