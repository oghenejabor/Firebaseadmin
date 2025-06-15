import React, { useState } from 'react';
import { Settings, Database, AlertCircle } from 'lucide-react';
import { initializeFirebase } from '../firebase/config';
import toast from 'react-hot-toast';

interface FirebaseConfigProps {
  onConfigured: () => void;
}

export const FirebaseConfig: React.FC<FirebaseConfigProps> = ({ onConfigured }) => {
  const [config, setConfig] = useState({
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await initializeFirebase(config);
      toast.success('Firebase connected successfully!');
      onConfigured();
    } catch (error: any) {
      toast.error(`Failed to connect to Firebase: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Database className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Firebase Admin Dashboard</h1>
          <p className="text-gray-600">Connect to your Firebase Realtime Database to get started</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Where to find your Firebase config:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Go to Firebase Console → Project Settings</li>
                <li>Scroll down to "Your apps" section</li>
                <li>Select your web app or create one</li>
                <li>Copy the config object values</li>
              </ol>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key *
              </label>
              <input
                type="text"
                required
                value={config.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="AIzaSyC..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auth Domain *
              </label>
              <input
                type="text"
                required
                value={config.authDomain}
                onChange={(e) => handleInputChange('authDomain', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your-project.firebaseapp.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Database URL *
              </label>
              <input
                type="text"
                required
                value={config.databaseURL}
                onChange={(e) => handleInputChange('databaseURL', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://your-project-default-rtdb.firebaseio.com/"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project ID *
              </label>
              <input
                type="text"
                required
                value={config.projectId}
                onChange={(e) => handleInputChange('projectId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your-project-id"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Storage Bucket
              </label>
              <input
                type="text"
                value={config.storageBucket}
                onChange={(e) => handleInputChange('storageBucket', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your-project.appspot.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Messaging Sender ID
              </label>
              <input
                type="text"
                value={config.messagingSenderId}
                onChange={(e) => handleInputChange('messagingSenderId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App ID *
              </label>
              <input
                type="text"
                required
                value={config.appId}
                onChange={(e) => handleInputChange('appId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1:123456789:web:abc123def456"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <Settings className="w-5 h-5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Database className="w-5 h-5 mr-2" />
                Connect to Firebase
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};