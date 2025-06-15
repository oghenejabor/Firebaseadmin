import React, { useState, useEffect } from 'react';
import { ref, get, set, push, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { Zap, Save, Loader, Eye, EyeOff, Key, Database, AlertCircle, Store, Plus, Edit, Trash2, X, RefreshCw, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApiConfig {
  username: string;
  password: string;
}

interface Brand {
  id: string;
  name: string;
  description?: string;
  website?: string;
  logo?: string;
  catalogId: string;
  originalCatalogId?: string;
}

export const ApiProductsManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingBrands, setFetchingBrands] = useState(false);
  const [importingBrands, setImportingBrands] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [editingBrand, setEditingBrand] = useState<string | null>(null);
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    username: 'IR9SJy9adgM74040414DAx5eDwyFyng8C1',
    password: '.WwYgfkgne_XCygrfmJgaiJKUqW6s3EQ'
  });
  const [brands, setBrands] = useState<{ [key: string]: Brand }>({});
  const [editForm, setEditForm] = useState<Brand>({
    id: '',
    name: '',
    description: '',
    website: '',
    logo: '',
    catalogId: ''
  });

  useEffect(() => {
    fetchApiConfig();
    fetchStoredBrands();
  }, []);

  const fetchApiConfig = async () => {
    try {
      const apiRef = ref(database, 'settings/impact_api');
      const snapshot = await get(apiRef);
      if (snapshot.exists()) {
        const config = snapshot.val();
        setApiConfig(config);
      }
    } catch (error: any) {
      toast.error(`Failed to fetch API config: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoredBrands = async () => {
    try {
      const brandsRef = ref(database, 'api_brands');
      const snapshot = await get(brandsRef);
      if (snapshot.exists()) {
        const brandsData = snapshot.val();
        // Convert array to object if needed
        if (Array.isArray(brandsData)) {
          const brandsObj: { [key: string]: Brand } = {};
          brandsData.forEach((brand, index) => {
            brandsObj[brand.id || index.toString()] = brand;
          });
          setBrands(brandsObj);
        } else {
          setBrands(brandsData);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch stored brands:', error);
    }
  };

  const handleSaveConfig = async () => {
    if (!apiConfig.username || !apiConfig.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const apiRef = ref(database, 'settings/impact_api');
      await set(apiRef, apiConfig);
      toast.success('API configuration saved successfully!');
    } catch (error: any) {
      toast.error(`Failed to save API config: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const fetchBrandsFromAPI = async () => {
    if (!apiConfig.username || !apiConfig.password) {
      toast.error('Please configure API credentials first');
      return;
    }

    setFetchingBrands(true);
    
    try {
      // Create the API endpoint using the configured username
      const API_ENDPOINT = `https://api.impact.com/Mediapartners/${apiConfig.username}/Stores`;
      
      // Create basic auth header
      const credentials = btoa(`${apiConfig.username}:${apiConfig.password}`);
      
      const response = await fetch(API_ENDPOINT, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Process the response data to extract brands/stores
      let brandsList: Brand[] = [];
      
      if (Array.isArray(data)) {
        brandsList = data.map((store: any, index: number) => ({
          id: store.Id || store.id || index.toString(),
          name: store.Name || store.name || store.StoreName || `Store ${index + 1}`,
          description: store.Description || store.description || '',
          website: store.Website || store.website || store.Url || '',
          logo: store.Logo || store.logo || store.LogoUrl || '',
          catalogId: store.CatalogId || store.catalogId || store.Id || store.id || '16836',
          originalCatalogId: store.CatalogId || store.catalogId || store.Id || store.id || '16836'
        }));
      } else if (data.Stores && Array.isArray(data.Stores)) {
        brandsList = data.Stores.map((store: any, index: number) => ({
          id: store.Id || store.id || index.toString(),
          name: store.Name || store.name || store.StoreName || `Store ${index + 1}`,
          description: store.Description || store.description || '',
          website: store.Website || store.website || store.Url || '',
          logo: store.Logo || store.logo || store.LogoUrl || '',
          catalogId: store.CatalogId || store.catalogId || store.Id || store.id || '16836',
          originalCatalogId: store.CatalogId || store.catalogId || store.Id || store.id || '16836'
        }));
      } else if (data.stores && Array.isArray(data.stores)) {
        brandsList = data.stores.map((store: any, index: number) => ({
          id: store.Id || store.id || index.toString(),
          name: store.Name || store.name || store.StoreName || `Store ${index + 1}`,
          description: store.Description || store.description || '',
          website: store.Website || store.website || store.Url || '',
          logo: store.Logo || store.logo || store.LogoUrl || '',
          catalogId: store.CatalogId || store.catalogId || store.Id || store.id || '16836',
          originalCatalogId: store.CatalogId || store.catalogId || store.Id || store.id || '16836'
        }));
      }

      // Sort brands alphabetically by name
      brandsList.sort((a, b) => a.name.localeCompare(b.name));

      // Convert to object format for easier management
      const brandsObj: { [key: string]: Brand } = {};
      brandsList.forEach(brand => {
        brandsObj[brand.id] = brand;
      });

      setBrands(brandsObj);
      toast.success(`Successfully fetched ${brandsList.length} brands from Impact.com API`);
      
    } catch (error: any) {
      console.error('API fetch error:', error);
      
      // Check if this is a CORS error
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        toast.error('CORS Error: Cannot access Impact.com API directly from browser. Please use a backend proxy.');
      } else {
        toast.error(`Failed to fetch brands: ${error.message}`);
      }
    } finally {
      setFetchingBrands(false);
    }
  };

  const handleImportBrands = async () => {
    if (Object.keys(brands).length === 0) {
      toast.error('No brands to import. Please fetch brands from API first.');
      return;
    }

    setImportingBrands(true);
    try {
      const brandsRef = ref(database, 'api_brands');
      await set(brandsRef, brands);
      toast.success(`Successfully imported ${Object.keys(brands).length} brands to Firebase!`);
    } catch (error: any) {
      toast.error(`Failed to import brands: ${error.message}`);
    } finally {
      setImportingBrands(false);
    }
  };

  const handleEditBrand = (brandId: string) => {
    setEditingBrand(brandId);
    setEditForm(brands[brandId]);
  };

  const handleSaveBrandEdit = async () => {
    if (!editForm.name.trim() || !editForm.catalogId.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const updatedBrands = {
        ...brands,
        [editingBrand!]: editForm
      };
      
      setBrands(updatedBrands);
      
      // Save to Firebase
      const brandsRef = ref(database, 'api_brands');
      await set(brandsRef, updatedBrands);
      
      setEditingBrand(null);
      toast.success('Brand updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update brand: ${error.message}`);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      try {
        const updatedBrands = { ...brands };
        delete updatedBrands[brandId];
        
        setBrands(updatedBrands);
        
        // Save to Firebase
        const brandsRef = ref(database, 'api_brands');
        await set(brandsRef, updatedBrands);
        
        toast.success('Brand deleted successfully!');
      } catch (error: any) {
        toast.error(`Failed to delete brand: ${error.message}`);
      }
    }
  };

  const updateField = (field: keyof ApiConfig, value: string) => {
    setApiConfig(prev => ({ ...prev, [field]: value }));
  };

  const maskSecret = (secret: string) => {
    if (!secret) return '';
    return secret.length > 8 ? 
      secret.substring(0, 4) + '*'.repeat(secret.length - 8) + secret.substring(secret.length - 4) :
      '*'.repeat(secret.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Zap className="w-6 h-6 text-purple-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">API Configuration</h2>
        </div>
        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start">
          <Database className="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-purple-800">
            <p className="font-medium mb-1">Impact.com API Configuration</p>
            <ul className="list-disc list-inside space-y-1 text-purple-700">
              <li>Configure your Impact.com API credentials securely</li>
              <li>Fetch brands from the API and import them to Firebase</li>
              <li>Edit catalog IDs for each brand to customize product imports</li>
              <li>Use the Import page to fetch products from specific brand catalogs</li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Configuration Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Impact.com API Credentials</h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username (Account SID) *
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={showSecrets ? apiConfig.username : maskSecret(apiConfig.username)}
                  onChange={(e) => showSecrets && updateField('username', e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="IR9SJy9adgM74040414DAx5eDwyFyng8C1"
                  readOnly={!showSecrets}
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password (Auth Token) *
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={showSecrets ? apiConfig.password : maskSecret(apiConfig.password)}
                  onChange={(e) => showSecrets && updateField('password', e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Your API password/token"
                  readOnly={!showSecrets}
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Management Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Brand Management</h3>
          <div className="flex gap-3">
            <button
              onClick={fetchBrandsFromAPI}
              disabled={fetchingBrands || !apiConfig.username || !apiConfig.password}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {fetchingBrands ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {fetchingBrands ? 'Fetching...' : 'Fetch Brands from API'}
            </button>
            
            {Object.keys(brands).length > 0 && (
              <button
                onClick={handleImportBrands}
                disabled={importingBrands}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {importingBrands ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {importingBrands ? 'Importing...' : 'Import to Firebase'}
              </button>
            )}
          </div>
        </div>

        {/* Brands List */}
        {Object.keys(brands).length > 0 ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              {Object.keys(brands).length} brands available. You can edit catalog IDs to customize which products are imported.
            </div>
            
            <div className="grid gap-4">
              {Object.entries(brands).map(([brandId, brand]) => (
                <div key={brandId} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  {editingBrand === brandId ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Brand Name *
                          </label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            placeholder="Brand name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Catalog ID *
                          </label>
                          <input
                            type="text"
                            value={editForm.catalogId}
                            onChange={(e) => setEditForm(prev => ({ ...prev, catalogId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            placeholder="Catalog ID for product imports"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="Brand description"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Website URL
                          </label>
                          <input
                            type="url"
                            value={editForm.website || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            placeholder="https://example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Logo URL
                          </label>
                          <input
                            type="url"
                            value={editForm.logo || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, logo: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            placeholder="https://example.com/logo.png"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveBrandEdit}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingBrand(null)}
                          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {brand.logo && (
                          <img
                            src={brand.logo}
                            alt={brand.name}
                            className="w-12 h-12 object-contain rounded-lg border border-gray-200 bg-white mr-4"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900">{brand.name}</h4>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Catalog ID:</span> 
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs ml-1">{brand.catalogId}</code>
                          </div>
                          {brand.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{brand.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-500">ID: {brand.id}</span>
                            {brand.website && (
                              <a
                                href={brand.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-purple-600 hover:text-purple-800 text-xs"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Website
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditBrand(brandId)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBrand(brandId)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No brands loaded</p>
            <p className="text-sm mb-4">Fetch brands from the Impact.com API to get started</p>
            <button
              onClick={fetchBrandsFromAPI}
              disabled={fetchingBrands || !apiConfig.username || !apiConfig.password}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {fetchingBrands ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {fetchingBrands ? 'Fetching...' : 'Fetch Brands Now'}
            </button>
          </div>
        )}
      </div>

      {/* API Endpoint Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">API Endpoint Information</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div>
            <span className="font-medium">Brands Endpoint:</span> 
            <code className="ml-2 bg-gray-200 px-2 py-1 rounded text-xs">
              https://api.impact.com/Mediapartners/{apiConfig.username}/Stores
            </code>
          </div>
          <div>
            <span className="font-medium">Products Endpoint:</span> 
            <code className="ml-2 bg-gray-200 px-2 py-1 rounded text-xs">
              https://api.impact.com/Mediapartners/{apiConfig.username}/Catalogs/[CATALOG_ID]/Items
            </code>
          </div>
          <div>
            <span className="font-medium">Authentication:</span> HTTP Basic Auth
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-green-800">
            <p className="font-medium mb-1">Workflow</p>
            <ol className="list-decimal list-inside space-y-1 text-green-700">
              <li>Configure your API credentials above</li>
              <li>Fetch brands from the Impact.com API</li>
              <li>Edit catalog IDs for each brand as needed</li>
              <li>Import brands to Firebase for permanent storage</li>
              <li>Go to the <strong>Import</strong> page to fetch products from specific brand catalogs</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};