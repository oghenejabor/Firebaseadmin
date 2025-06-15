import React, { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../../firebase/config';
import { Settings, Save, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdsManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adsData, setAdsData] = useState({
    Admob: {
      abcd: '',
      appID: '',
      bannerAdsID: '',
      interstitialID: '',
      nativeAds: '',
      rewardAdID: ''
    },
    Facebook: {
      fbBannerID: '',
      fbInterID: ''
    },
    isAdmobEnabled: 'false'
  });

  useEffect(() => {
    fetchAdsData();
  }, []);

  const fetchAdsData = async () => {
    try {
      const adsRef = ref(database, 'Ads');
      const snapshot = await get(adsRef);
      if (snapshot.exists()) {
        setAdsData(snapshot.val());
      }
    } catch (error: any) {
      toast.error(`Failed to fetch ads data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const adsRef = ref(database, 'Ads');
      await set(adsRef, adsData);
      toast.success('Ads settings saved successfully!');
    } catch (error: any) {
      toast.error(`Failed to save ads settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateAdmobField = (field: string, value: string) => {
    setAdsData(prev => ({
      ...prev,
      Admob: {
        ...prev.Admob,
        [field]: value
      }
    }));
  };

  const updateFacebookField = (field: string, value: string) => {
    setAdsData(prev => ({
      ...prev,
      Facebook: {
        ...prev.Facebook,
        [field]: value
      }
    }));
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
          <Settings className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Ads Configuration</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AdMob Settings */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">AdMob Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App ID
              </label>
              <input
                type="text"
                value={adsData.Admob.appID}
                onChange={(e) => updateAdmobField('appID', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ca-app-pub-3940256099942544~3347511713"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banner Ads ID
              </label>
              <input
                type="text"
                value={adsData.Admob.bannerAdsID}
                onChange={(e) => updateAdmobField('bannerAdsID', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ca-app-pub-3940256099942544/6300978111"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interstitial ID
              </label>
              <input
                type="text"
                value={adsData.Admob.interstitialID}
                onChange={(e) => updateAdmobField('interstitialID', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ca-app-pub-3940256099942544/1033173712"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Native Ads ID
              </label>
              <input
                type="text"
                value={adsData.Admob.nativeAds}
                onChange={(e) => updateAdmobField('nativeAds', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ca-app-pub-3940256099942544/2247696110"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reward Ad ID
              </label>
              <input
                type="text"
                value={adsData.Admob.rewardAdID}
                onChange={(e) => updateAdmobField('rewardAdID', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ca-app-pub-3940256099942544/5224354917"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Field (ABCD)
              </label>
              <input
                type="text"
                value={adsData.Admob.abcd}
                onChange={(e) => updateAdmobField('abcd', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Custom value"
              />
            </div>
          </div>
        </div>

        {/* Facebook Ads & General Settings */}
        <div className="space-y-6">
          {/* Facebook Ads */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Facebook Ads</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook Banner ID
                </label>
                <input
                  type="text"
                  value={adsData.Facebook.fbBannerID}
                  onChange={(e) => updateFacebookField('fbBannerID', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="645172049494972_645172419494935"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook Interstitial ID
                </label>
                <input
                  type="text"
                  value={adsData.Facebook.fbInterID}
                  onChange={(e) => updateFacebookField('fbInterID', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="645172049494972_645172419494935"
                />
              </div>
            </div>
          </div>

          {/* General Settings */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">General Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AdMob Status
              </label>
              <select
                value={adsData.isAdmobEnabled}
                onChange={(e) => setAdsData(prev => ({ ...prev, isAdmobEnabled: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};