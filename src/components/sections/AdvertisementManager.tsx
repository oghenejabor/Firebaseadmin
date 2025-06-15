import React, { useState, useEffect, useRef } from 'react';
import { ref, get, set, push, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { 
  Monitor, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Loader, 
  Upload,
  Image as ImageIcon,
  Video,
  ExternalLink,
  BarChart3,
  Eye,
  MousePointer,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  Play,
  Target,
  Power,
  PowerOff,
  Activity,
  Users,
  Zap,
  DollarSign,
  Percent,
  LineChart,
  PieChart
} from 'lucide-react';
import { uploadFileToS3 } from '../../utils/s3Upload';
import toast from 'react-hot-toast';

interface Advertisement {
  adId?: string;
  title: string;
  destinationUrl: string;
  callToAction: string;
  adType: 'video' | 'image';
  mediaUrl: string;
  isActive: boolean;
  analytics: {
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    conversionRate: number;
    dailyStats: { [date: string]: { impressions: number; clicks: number; conversions: number } };
    lastUpdated: number;
  };
  createdAt: number;
  updatedAt: number;
}

const CALL_TO_ACTION_OPTIONS = [
  'Learn More',
  'Get Started',
  'Sign Up',
  'Install App',
  'Shop Now',
  'Download',
  'Contact Us',
  'Subscribe'
];

export const AdvertisementManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ads, setAds] = useState<{ [key: string]: Advertisement }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedAdForAnalytics, setSelectedAdForAnalytics] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState<Advertisement>({
    title: '',
    destinationUrl: '',
    callToAction: 'Learn More',
    adType: 'image',
    mediaUrl: '',
    isActive: true,
    analytics: {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      conversions: 0,
      conversionRate: 0,
      dailyStats: {},
      lastUpdated: Date.now()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  useEffect(() => {
    fetchAdvertisements();
    // Simulate real-time analytics updates
    const interval = setInterval(() => {
      simulateAnalyticsUpdate();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchAdvertisements = async () => {
    try {
      const adsRef = ref(database, 'advertisements');
      const snapshot = await get(adsRef);
      if (snapshot.exists()) {
        const adsData = snapshot.val();
        // Ensure analytics structure exists for all ads
        const processedAds = Object.fromEntries(
          Object.entries(adsData).map(([id, ad]: [string, any]) => [
            id,
            {
              ...ad,
              analytics: {
                impressions: ad.analytics?.impressions || 0,
                clicks: ad.analytics?.clicks || 0,
                ctr: ad.analytics?.ctr || 0,
                conversions: ad.analytics?.conversions || 0,
                conversionRate: ad.analytics?.conversionRate || 0,
                dailyStats: ad.analytics?.dailyStats || {},
                lastUpdated: ad.analytics?.lastUpdated || Date.now()
              }
            }
          ])
        );
        setAds(processedAds);
      }
    } catch (error: any) {
      toast.error(`Failed to fetch advertisements: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const simulateAnalyticsUpdate = async () => {
    // Simulate real-time analytics updates for active ads
    const updatedAds = { ...ads };
    let hasUpdates = false;

    Object.entries(updatedAds).forEach(([id, ad]) => {
      if (ad.isActive) {
        // Simulate random analytics updates
        const newImpressions = Math.floor(Math.random() * 50) + 1;
        const newClicks = Math.floor(Math.random() * Math.min(newImpressions / 10, 5));
        const newConversions = Math.floor(Math.random() * Math.min(newClicks / 2, 2));

        const updatedAnalytics = {
          ...ad.analytics,
          impressions: ad.analytics.impressions + newImpressions,
          clicks: ad.analytics.clicks + newClicks,
          conversions: ad.analytics.conversions + newConversions,
          lastUpdated: Date.now()
        };

        // Calculate CTR and conversion rate
        updatedAnalytics.ctr = updatedAnalytics.impressions > 0 
          ? (updatedAnalytics.clicks / updatedAnalytics.impressions) * 100 
          : 0;
        updatedAnalytics.conversionRate = updatedAnalytics.clicks > 0 
          ? (updatedAnalytics.conversions / updatedAnalytics.clicks) * 100 
          : 0;

        // Update daily stats
        const today = new Date().toISOString().split('T')[0];
        const dailyStats = { ...updatedAnalytics.dailyStats };
        if (!dailyStats[today]) {
          dailyStats[today] = { impressions: 0, clicks: 0, conversions: 0 };
        }
        dailyStats[today].impressions += newImpressions;
        dailyStats[today].clicks += newClicks;
        dailyStats[today].conversions += newConversions;
        updatedAnalytics.dailyStats = dailyStats;

        updatedAds[id] = { ...ad, analytics: updatedAnalytics };
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      setAds(updatedAds);
      // Update in Firebase
      try {
        const adsRef = ref(database, 'advertisements');
        await set(adsRef, updatedAds);
      } catch (error) {
        console.error('Failed to update analytics:', error);
      }
    }
  };

  const handleMediaFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (editForm.adType === 'video') {
      // Video validation - only format check
      const validVideoTypes = ['video/mp4'];
      if (!validVideoTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.mp4')) {
        toast.error('Please select a valid MP4 video file');
        return;
      }
    } else {
      // Image validation - only format check
      const validImageTypes = ['image/jpeg', 'image/png'];
      if (!validImageTypes.includes(file.type)) {
        toast.error('Please select a valid JPG or PNG image file');
        return;
      }
    }

    setMediaFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const validateForm = (): boolean => {
    if (!editForm.title.trim()) {
      toast.error('Advertisement title is required');
      return false;
    }
    if (editForm.title.length > 60) {
      toast.error('Advertisement title must be 60 characters or less');
      return false;
    }
    if (!editForm.destinationUrl.trim()) {
      toast.error('Destination URL is required');
      return false;
    }
    try {
      const url = new URL(editForm.destinationUrl);
      if (!url.protocol.startsWith('http')) {
        throw new Error('Invalid protocol');
      }
    } catch {
      toast.error('Please enter a valid URL starting with http:// or https://');
      return false;
    }
    if (!editForm.callToAction) {
      toast.error('Please select a call-to-action button');
      return false;
    }
    return true;
  };

  const uploadMediaFile = async (): Promise<string> => {
    if (!mediaFile) {
      throw new Error('No media file selected');
    }

    try {
      const folder = editForm.adType === 'video' ? 'ad-videos' : 'ad-images';
      const mediaUrl = await uploadFileToS3(
        mediaFile,
        folder,
        (progress) => setUploadProgress(progress.percentage)
      );
      return mediaUrl;
    } catch (error) {
      throw new Error(`Media upload failed: ${error}`);
    }
  };

  const handleAddAdvertisement = async () => {
    if (!validateForm()) return;
    
    if (!mediaFile) {
      toast.error(`Please select a ${editForm.adType} file`);
      return;
    }

    setUploading(true);
    try {
      const mediaUrl = await uploadMediaFile();

      const adsRef = ref(database, 'advertisements');
      const newAdRef = push(adsRef);
      
      const adData: Advertisement = {
        ...editForm,
        adId: newAdRef.key!,
        mediaUrl,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await set(newAdRef, adData);
      setAds(prev => ({ ...prev, [newAdRef.key!]: adData }));

      resetForm();
      toast.success('Advertisement created successfully!');
    } catch (error: any) {
      toast.error(`Failed to create advertisement: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditAdvertisement = (id: string) => {
    setEditingId(id);
    setEditForm({ ...ads[id] });
    setPreviewUrl(ads[id].mediaUrl);
  };

  const handleSaveEdit = async () => {
    if (!validateForm()) return;

    setUploading(true);
    try {
      let updatedData = { ...editForm, updatedAt: Date.now() };

      // Upload new media file if selected
      if (mediaFile) {
        const mediaUrl = await uploadMediaFile();
        updatedData.mediaUrl = mediaUrl;
      }

      const adRef = ref(database, `advertisements/${editingId}`);
      await set(adRef, updatedData);

      setAds(prev => ({ ...prev, [editingId!]: updatedData }));
      setEditingId(null);
      resetForm();
      toast.success('Advertisement updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update advertisement: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteAdvertisement = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this advertisement? This action cannot be undone.')) {
      try {
        const adRef = ref(database, `advertisements/${id}`);
        await remove(adRef);

        const updatedAds = { ...ads };
        delete updatedAds[id];
        setAds(updatedAds);

        toast.success('Advertisement deleted successfully!');
      } catch (error: any) {
        toast.error(`Failed to delete advertisement: ${error.message}`);
      }
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const updatedAd = { ...ads[id], isActive: !ads[id].isActive, updatedAt: Date.now() };
      const adRef = ref(database, `advertisements/${id}`);
      await set(adRef, updatedAd);

      setAds(prev => ({ ...prev, [id]: updatedAd }));
      toast.success(`Advertisement ${updatedAd.isActive ? 'activated' : 'deactivated'}`);
    } catch (error: any) {
      toast.error(`Failed to update advertisement status: ${error.message}`);
    }
  };

  const resetForm = () => {
    setEditForm({
      title: '',
      destinationUrl: '',
      callToAction: 'Learn More',
      adType: 'image',
      mediaUrl: '',
      isActive: true,
      analytics: {
        impressions: 0,
        clicks: 0,
        ctr: 0,
        conversions: 0,
        conversionRate: 0,
        dailyStats: {},
        lastUpdated: Date.now()
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setMediaFile(null);
    setPreviewUrl('');
    setShowAddForm(false);
    setEditingId(null);
    if (mediaInputRef.current) mediaInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return num.toFixed(2) + '%';
  };

  const getTotalAnalytics = () => {
    return Object.values(ads).reduce(
      (total, ad) => ({
        impressions: total.impressions + ad.analytics.impressions,
        clicks: total.clicks + ad.analytics.clicks,
        conversions: total.conversions + ad.analytics.conversions,
        ctr: 0, // Will be calculated
        conversionRate: 0 // Will be calculated
      }),
      { impressions: 0, clicks: 0, conversions: 0, ctr: 0, conversionRate: 0 }
    );
  };

  const getLastSevenDaysData = (ad: Advertisement) => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = ad.analytics.dailyStats[dateStr] || { impressions: 0, clicks: 0, conversions: 0 };
      last7Days.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        ...dayData
      });
    }
    
    return last7Days;
  };

  const totalStats = getTotalAnalytics();
  totalStats.ctr = totalStats.impressions > 0 ? (totalStats.clicks / totalStats.impressions) * 100 : 0;
  totalStats.conversionRate = totalStats.clicks > 0 ? (totalStats.conversions / totalStats.clicks) * 100 : 0;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <Monitor className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Advertisement Management</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="text-sm text-gray-500">
            {Object.keys(ads).length} advertisements
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Ad
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h3>
            <div className="flex items-center text-sm text-gray-500">
              <Activity className="w-4 h-4 mr-1" />
              Real-time data
            </div>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Impressions</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(totalStats.impressions)}</p>
                </div>
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Clicks</p>
                  <p className="text-2xl font-bold text-green-900">{formatNumber(totalStats.clicks)}</p>
                </div>
                <MousePointer className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Click-Through Rate</p>
                  <p className="text-2xl font-bold text-purple-900">{formatPercentage(totalStats.ctr)}</p>
                </div>
                <Percent className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Conversions</p>
                  <p className="text-2xl font-bold text-orange-900">{formatNumber(totalStats.conversions)}</p>
                </div>
                <Target className="w-8 h-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-red-900">{formatPercentage(totalStats.conversionRate)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Individual Ad Analytics */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-gray-900">Individual Ad Performance</h4>
            
            {Object.entries(ads).map(([id, ad]) => {
              const last7Days = getLastSevenDaysData(ad);
              const isExpanded = selectedAdForAnalytics === id;
              
              return (
                <div key={id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setSelectedAdForAnalytics(isExpanded ? null : id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-4">
                          {ad.adType === 'video' ? (
                            <Video className="w-8 h-8 text-purple-600" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">{ad.title}</h5>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              ad.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {ad.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span>CTR: {formatPercentage(ad.analytics.ctr)}</span>
                            <span>Conversions: {ad.analytics.conversions}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{formatNumber(ad.analytics.impressions)}</div>
                          <div className="text-gray-500">Impressions</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{formatNumber(ad.analytics.clicks)}</div>
                          <div className="text-gray-500">Clicks</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{formatPercentage(ad.analytics.conversionRate)}</div>
                          <div className="text-gray-500">Conv. Rate</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 border-t border-gray-200">
                      {/* Detailed Analytics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <Eye className="w-6 h-6 text-blue-600 mr-3" />
                            <div>
                              <div className="text-lg font-bold text-blue-900">{formatNumber(ad.analytics.impressions)}</div>
                              <div className="text-blue-700 text-sm">Impressions</div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <MousePointer className="w-6 h-6 text-green-600 mr-3" />
                            <div>
                              <div className="text-lg font-bold text-green-900">{formatNumber(ad.analytics.clicks)}</div>
                              <div className="text-green-700 text-sm">Clicks</div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <Percent className="w-6 h-6 text-purple-600 mr-3" />
                            <div>
                              <div className="text-lg font-bold text-purple-900">{formatPercentage(ad.analytics.ctr)}</div>
                              <div className="text-purple-700 text-sm">CTR</div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <Target className="w-6 h-6 text-orange-600 mr-3" />
                            <div>
                              <div className="text-lg font-bold text-orange-900">{formatNumber(ad.analytics.conversions)}</div>
                              <div className="text-orange-700 text-sm">Conversions</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 7-Day Trend */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h6 className="font-medium text-gray-900 mb-4">Last 7 Days Performance</h6>
                        <div className="grid grid-cols-7 gap-2">
                          {last7Days.map((day, index) => (
                            <div key={index} className="text-center">
                              <div className="text-xs text-gray-500 mb-1">{day.day}</div>
                              <div className="bg-white rounded p-2 border">
                                <div className="text-xs font-medium text-blue-600">{day.impressions}</div>
                                <div className="text-xs text-gray-500">views</div>
                                <div className="text-xs font-medium text-green-600 mt-1">{day.clicks}</div>
                                <div className="text-xs text-gray-500">clicks</div>
                                {day.conversions > 0 && (
                                  <>
                                    <div className="text-xs font-medium text-orange-600 mt-1">{day.conversions}</div>
                                    <div className="text-xs text-gray-500">conv.</div>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Ad Preview */}
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg mr-4 overflow-hidden">
                            {ad.adType === 'video' ? (
                              <video src={ad.mediaUrl} className="w-full h-full object-cover" />
                            ) : (
                              <img src={ad.mediaUrl} alt={ad.title} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{ad.title}</div>
                            <div className="text-sm text-gray-500">CTA: {ad.callToAction}</div>
                            <div className="text-xs text-gray-400">
                              Last updated: {new Date(ad.analytics.lastUpdated).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <a
                          href={ad.destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-sm"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Landing Page
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {Object.keys(ads).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No advertisements to analyze</p>
                <p className="text-sm">Create your first advertisement to see analytics</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Advertisement Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Create New Advertisement</h3>
          
          {/* Ad Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Advertisement Type *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setEditForm(prev => ({ ...prev, adType: 'image' }));
                  setMediaFile(null);
                  setPreviewUrl('');
                }}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  editForm.adType === 'image'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                <div className="font-medium">Image Ad</div>
                <div className="text-sm text-gray-600">JPG/PNG • 512x515px recommended</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditForm(prev => ({ ...prev, adType: 'video' }));
                  setMediaFile(null);
                  setPreviewUrl('');
                }}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  editForm.adType === 'video'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Video className="w-8 h-8 mx-auto mb-2" />
                <div className="font-medium">Video Ad</div>
                <div className="text-sm text-gray-600">MP4 • 9:16 ratio recommended</div>
              </button>
            </div>
          </div>

          {/* Media Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {editForm.adType === 'video' ? 'Video File' : 'Image File'} *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition-colors">
              <input
                ref={mediaInputRef}
                type="file"
                accept={editForm.adType === 'video' ? '.mp4,video/mp4' : '.jpg,.jpeg,.png,image/jpeg,image/png'}
                onChange={handleMediaFileSelect}
                className="hidden"
              />
              {previewUrl ? (
                <div className="space-y-3">
                  {editForm.adType === 'video' ? (
                    <video
                      src={previewUrl}
                      className="max-w-full max-h-48 mx-auto rounded-lg"
                      controls
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-48 mx-auto rounded-lg"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 break-all">{mediaFile?.name}</p>
                    <p className="text-xs text-gray-600">{mediaFile && formatFileSize(mediaFile.size)}</p>
                  </div>
                  {uploadProgress > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {editForm.adType === 'video' ? (
                    <Video className="w-12 h-12 mx-auto text-gray-400" />
                  ) : (
                    <ImageIcon className="w-12 h-12 mx-auto text-gray-400" />
                  )}
                  <p className="text-sm text-gray-600">
                    Click to upload {editForm.adType === 'video' ? 'video' : 'image'}
                  </p>
                  <p className="text-xs text-gray-500 px-2">
                    {editForm.adType === 'video' 
                      ? 'MP4 format, 9:16 aspect ratio recommended for optimal display'
                      : 'JPG/PNG format, 512x515 pixels recommended for optimal display'
                    }
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                {previewUrl ? 'Change File' : 'Select File'}
              </button>
            </div>
          </div>

          {/* Ad Details */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Advertisement Title * (Max 60 characters)
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                maxLength={60}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter compelling ad title"
              />
              <p className="text-xs text-gray-500 mt-1">{editForm.title.length}/60 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination URL *
              </label>
              <input
                type="url"
                value={editForm.destinationUrl}
                onChange={(e) => setEditForm(prev => ({ ...prev, destinationUrl: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/landing-page"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call-to-Action Button *
              </label>
              <select
                value={editForm.callToAction}
                onChange={(e) => setEditForm(prev => ({ ...prev, callToAction: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {CALL_TO_ACTION_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={editForm.isActive}
                onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Activate advertisement immediately
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 order-2 sm:order-1"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleAddAdvertisement}
              disabled={uploading || !mediaFile}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 order-1 sm:order-2"
            >
              {uploading ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {uploading ? 'Creating...' : 'Create Advertisement'}
            </button>
          </div>
        </div>
      )}

      {/* Advertisements List */}
      <div className="space-y-4">
        {Object.entries(ads).map(([id, ad]) => (
          <div key={id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {editingId === id ? (
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Advertisement Title * (Max 60 characters)
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter ad title"
                  />
                  <p className="text-xs text-gray-500 mt-1">{editForm.title.length}/60 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination URL *
                  </label>
                  <input
                    type="url"
                    value={editForm.destinationUrl}
                    onChange={(e) => setEditForm(prev => ({ ...prev, destinationUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Call-to-Action Button *
                  </label>
                  <select
                    value={editForm.callToAction}
                    onChange={(e) => setEditForm(prev => ({ ...prev, callToAction: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {CALL_TO_ACTION_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Media Update */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update {ad.adType === 'video' ? 'Video' : 'Image'} (Optional)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => mediaInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      {mediaFile ? 'File Selected' : `Change ${ad.adType}`}
                    </button>
                    {previewUrl && (
                      <div className="flex-1">
                        {ad.adType === 'video' ? (
                          <video src={previewUrl} className="h-16 w-full sm:w-auto rounded" controls />
                        ) : (
                          <img src={previewUrl} alt="Preview" className="h-16 w-full sm:w-auto object-cover rounded" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Advertisement is active
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={uploading}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {uploading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    disabled={uploading}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Ad Title and Status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{ad.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          ad.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {ad.isActive ? (
                            <>
                              <Power className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <PowerOff className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {ad.adType === 'video' ? (
                            <>
                              <Video className="w-3 h-3 mr-1" />
                              Video
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-3 h-3 mr-1" />
                              Image
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    
                    {/* Quick Analytics */}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>{formatNumber(ad.analytics.impressions)} impressions</span>
                      <span>{formatNumber(ad.analytics.clicks)} clicks</span>
                      <span>{formatPercentage(ad.analytics.ctr)} CTR</span>
                      <span>{ad.analytics.conversions} conversions</span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => handleToggleActive(id)}
                      className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        ad.isActive
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-green-600 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      {ad.isActive ? (
                        <>
                          <PowerOff className="w-4 h-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Deactivate</span>
                          <span className="sm:hidden">Deactivate</span>
                        </>
                      ) : (
                        <>
                          <Power className="w-4 h-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Activate</span>
                          <span className="sm:hidden">Activate</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleEditAdvertisement(id)}
                      className="flex items-center justify-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-sm font-medium transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                      <span className="sm:hidden">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteAdvertisement(id)}
                      className="flex items-center justify-center px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Delete</span>
                      <span className="sm:hidden">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {Object.keys(ads).length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No advertisements created yet</p>
            <p className="text-sm">Create your first advertisement above</p>
          </div>
        )}
      </div>

      {/* Requirements Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Advertisement Features</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li><strong>Real-time Analytics:</strong> Track impressions, clicks, CTR, and conversions</li>
              <li><strong>Video Ads:</strong> MP4 format recommended, 9:16 aspect ratio for optimal display</li>
              <li><strong>Image Ads:</strong> JPG/PNG format recommended, 512x515 pixels for optimal display</li>
              <li><strong>Performance Tracking:</strong> 7-day trend analysis and detailed metrics</li>
              <li><strong>S3 Storage:</strong> All media files are securely stored in your S3 bucket</li>
              <li><strong>Flexible Upload:</strong> Any file size accepted, recommendations provided for best results</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Hidden file input for editing */}
      <input
        ref={mediaInputRef}
        type="file"
        accept={editForm.adType === 'video' ? '.mp4,video/mp4' : '.jpg,.jpeg,.png,image/jpeg,image/png'}
        onChange={handleMediaFileSelect}
        className="hidden"
      />
    </div>
  );
};