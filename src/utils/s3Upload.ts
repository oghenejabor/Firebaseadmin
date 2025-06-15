import AWS from 'aws-sdk';
import { ref, get } from 'firebase/database';
import { database } from '../firebase/config';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
}

let s3Instance: AWS.S3 | null = null;
let currentConfig: S3Config | null = null;

const initializeS3 = async (): Promise<AWS.S3> => {
  try {
    // Fetch S3 config from Firebase
    const s3Ref = ref(database, 'settings/s3');
    const snapshot = await get(s3Ref);
    
    if (!snapshot.exists()) {
      throw new Error('S3 configuration not found. Please configure S3 settings in the admin panel.');
    }

    const config: S3Config = snapshot.val();
    
    if (!config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
      throw new Error('Incomplete S3 configuration. Please check your S3 settings.');
    }

    // Only reinitialize if config has changed
    if (!s3Instance || !currentConfig || 
        currentConfig.accessKeyId !== config.accessKeyId ||
        currentConfig.region !== config.region ||
        currentConfig.bucketName !== config.bucketName) {
      
      AWS.config.update({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
      });

      s3Instance = new AWS.S3();
      currentConfig = config;
    }

    return s3Instance;
  } catch (error) {
    console.error('Failed to initialize S3:', error);
    throw error;
  }
};

export const uploadFileToS3 = async (
  file: File,
  folder: string = 'uploads',
  onProgress?: (progress: UploadProgress) => void
): Promise<string> => {
  try {
    const s3 = await initializeS3();
    
    if (!currentConfig) {
      throw new Error('S3 configuration not available');
    }

    return new Promise((resolve, reject) => {
      const fileName = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const uploadParams = {
        Bucket: currentConfig.bucketName,
        Key: fileName,
        Body: file,
        ContentType: file.type,
      };

      const upload = s3.upload(uploadParams);

      if (onProgress) {
        upload.on('httpUploadProgress', (progress) => {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          onProgress({
            loaded: progress.loaded,
            total: progress.total,
            percentage,
          });
        });
      }

      upload.send((err, data) => {
        if (err) {
          console.error('S3 upload error:', err);
          reject(new Error(`Upload failed: ${err.message}`));
        } else {
          resolve(data.Location);
        }
      });
    });
  } catch (error) {
    console.error('S3 upload initialization error:', error);
    throw error;
  }
};

export const deleteFileFromS3 = async (fileUrl: string): Promise<void> => {
  try {
    const s3 = await initializeS3();
    
    if (!currentConfig) {
      throw new Error('S3 configuration not available');
    }

    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash
    
    const deleteParams = {
      Bucket: currentConfig.bucketName,
      Key: key,
    };

    await s3.deleteObject(deleteParams).promise();
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
};

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};