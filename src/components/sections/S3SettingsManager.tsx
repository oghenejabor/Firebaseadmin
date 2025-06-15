import React, { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../../firebase/config';
import { Cloud, Save, Loader, Eye, EyeOff, Key, Database } from 'lucide-react';
import toast from 'react-hot-toast';

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
}

export const S3SettingsManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [s3Config, setS3Config] = useState<S3Config>({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    bucketName: ''
  });

  useEffect(() => {
    fetchS3Config();
  }, []);

  const fetchS3Config = async () => {
    try {
      const s3Ref = ref(database, 'settings/s3');
      const snapshot = await get(s3Ref);
      if (snapshot.exists()) {
        setS3Config(snapshot.val());
      }
    } catch (error: any) {
      toast.error(`Failed to fetch S3 settings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const s3Ref = ref(database, 'settings/s3');
      await set(s3Ref, s3Config);
      toast.success('S3 settings saved successfully!');
    } catch (error: any) {
      toast.error(`Failed to save S3 settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof S3Config, value: string) => {
    setS3Config(prev => ({ ...prev, [field]: value }));
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
          <Cloud className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Amazon S3 Settings</h2>
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
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Database className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Configure your Amazon S3 credentials for file uploads</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Create an S3 bucket in your AWS console</li>
              <li>Create an IAM user with S3 permissions</li>
              <li>Generate access keys for the IAM user</li>
              <li>Ensure your bucket has proper CORS configuration</li>
            </ul>
          </div>
        </div>
      </div>

      {/* S3 Configuration Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">S3 Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Key ID *
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type={showSecrets ? 'text' : 'password'}
                value={showSecrets ? s3Config.accessKeyId : maskSecret(s3Config.accessKeyId)}
                onChange={(e) => showSecrets && updateField('accessKeyId', e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="AKIA..."
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
              Secret Access Key *
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type={showSecrets ? 'text' : 'password'}
                value={showSecrets ? s3Config.secretAccessKey : maskSecret(s3Config.secretAccessKey)}
                onChange={(e) => showSecrets && updateField('secretAccessKey', e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Secret access key"
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
              AWS Region *
            </label>
            <select
              value={s3Config.region}
              onChange={(e) => updateField('region', e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-east-2">US East (Ohio)</option>
              <option value="us-west-1">US West (N. California)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">Europe (Ireland)</option>
              <option value="eu-west-2">Europe (London)</option>
              <option value="eu-west-3">Europe (Paris)</option>
              <option value="eu-central-1">Europe (Frankfurt)</option>
              <option value="ap-south-1">Asia Pacific (Mumbai)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
              <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
              <option value="ap-northeast-2">Asia Pacific (Seoul)</option>
              <option value="sa-east-1">South America (São Paulo)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bucket Name *
            </label>
            <input
              type="text"
              value={s3Config.bucketName}
              onChange={(e) => updateField('bucketName', e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="my-bucket-name"
            />
          </div>
        </div>

        {/* CORS Configuration Info */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">Required CORS Configuration</h4>
          <p className="text-sm text-yellow-700 mb-3">
            Add this CORS configuration to your S3 bucket:
          </p>
          <pre className="bg-yellow-100 p-3 rounded text-xs overflow-x-auto">
{`[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]`}
          </pre>
        </div>

        {/* IAM Policy Info */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">Required IAM Policy</h4>
          <p className="text-sm text-green-700 mb-3">
            Attach this policy to your IAM user:
          </p>
          <pre className="bg-green-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};