import React, { useState, useEffect, useRef } from 'react';
import { ref, get, set, push, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { 
  Video, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Loader, 
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Play,
  Search,
  Filter,
  Calendar,
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Grid,
  Maximize2,
  DollarSign
} from 'lucide-react';
import { uploadFileToS3 } from '../../utils/s3Upload';
import toast from 'react-hot-toast';

interface ProductImage {
  imageId: string;
  imageUrl: string;
  caption?: string;
  isPrimary: boolean;
  uploadedAt: number;
}

interface VideoProduct {
  productId?: string;
  title: string;
  description: string;
  productUrl: string;
  videoUrl: string;
  thumbnailUrl: string;
  price: string;
  currency: string;
  images: { [key: string]: ProductImage };
  createdAt: number;
  updatedAt: number;
}

export const VideosManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [videos, setVideos] = useState<{ [key: string]: VideoProduct }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'price'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filteredVideos, setFilteredVideos] = useState<{ [key: string]: VideoProduct }>({});

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
  const [imageUploadProgress, setImageUploadProgress] = useState<{ [key: string]: number }>({});

  // Gallery states
  const [viewingGallery, setViewingGallery] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState<VideoProduct>({
    title: '',
    description: '',
    productUrl: '',
    videoUrl: '',
    thumbnailUrl: '',
    price: '',
    currency: 'USD',
    images: {},
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' }
  ];

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    filterAndSortVideos();
  }, [videos, searchTerm, sortBy, sortOrder]);

  const fetchVideos = async () => {
    try {
      const videosRef = ref(database, 'videoProducts');
      const snapshot = await get(videosRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Ensure images property and price fields exist for all products
        const processedData = Object.fromEntries(
          Object.entries(data).map(([id, product]: [string, any]) => [
            id,
            { 
              ...product, 
              images: product.images || {},
              price: product.price || '',
              currency: product.currency || 'USD'
            }
          ])
        );
        setVideos(processedData);
      }
    } catch (error: any) {
      toast.error(`Failed to fetch videos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortVideos = () => {
    let filtered = { ...videos };

    // Apply search filter
    if (searchTerm) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([id, video]) =>
          video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          video.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          video.price.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Sort videos
    const sortedEntries = Object.entries(filtered).sort(([, a], [, b]) => {
      let comparison = 0;
      
      if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'price') {
        const priceA = parseFloat(a.price.replace(/[^0-9.-]/g, '')) || 0;
        const priceB = parseFloat(b.price.replace(/[^0-9.-]/g, '')) || 0;
        comparison = priceA - priceB;
      } else {
        comparison = a.createdAt - b.createdAt;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredVideos(Object.fromEntries(sortedEntries));
  };

  const handleVideoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['video/mp4', 'video/mov', 'video/avi'];
      if (validTypes.includes(file.type) || file.name.match(/\.(mp4|mov|avi)$/i)) {
        if (file.size > 100 * 1024 * 1024) { // 100MB limit
          toast.error('Video file size must be less than 100MB');
          return;
        }
        setVideoFile(file);
      } else {
        toast.error('Please select a valid video file (.mp4, .mov, .avi)');
      }
    }
  };

  const handleThumbnailFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (validTypes.includes(file.type)) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast.error('Thumbnail file size must be less than 5MB');
          return;
        }
        setThumbnailFile(file);
      } else {
        toast.error('Please select a valid image file (.jpg, .png, .webp)');
      }
    }
  };

  const handleImageFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles: File[] = [];
    
    files.forEach(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (validTypes.includes(file.type)) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit per image
          toast.error(`Image ${file.name} is too large. Max size is 5MB`);
        } else {
          validFiles.push(file);
        }
      } else {
        toast.error(`${file.name} is not a valid image format`);
      }
    });

    if (validFiles.length > 10) {
      toast.error('Maximum 10 images allowed per product');
      setImageFiles(validFiles.slice(0, 10));
    } else {
      setImageFiles(validFiles);
    }
  };

  const uploadFiles = async (): Promise<{ videoUrl: string; thumbnailUrl: string; imageUrls: ProductImage[] }> => {
    if (!videoFile || !thumbnailFile) {
      throw new Error('Both video and thumbnail files are required');
    }

    try {
      // Upload video file
      const videoUrl = await uploadFileToS3(
        videoFile,
        'videos',
        (progress) => setVideoUploadProgress(progress.percentage)
      );

      // Upload thumbnail file
      const thumbnailUrl = await uploadFileToS3(
        thumbnailFile,
        'video-thumbnails',
        (progress) => setThumbnailUploadProgress(progress.percentage)
      );

      // Upload additional images
      const imageUrls: ProductImage[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const imageUrl = await uploadFileToS3(
          file,
          'product-images',
          (progress) => {
            setImageUploadProgress(prev => ({
              ...prev,
              [`image_${i}`]: progress.percentage
            }));
          }
        );

        imageUrls.push({
          imageId: `img_${Date.now()}_${i}`,
          imageUrl,
          caption: '',
          isPrimary: i === 0, // First image is primary by default
          uploadedAt: Date.now()
        });
      }

      return { videoUrl, thumbnailUrl, imageUrls };
    } catch (error) {
      throw new Error(`File upload failed: ${error}`);
    }
  };

  const validateForm = (): boolean => {
    if (!editForm.title.trim()) {
      toast.error('Product title is required');
      return false;
    }
    if (editForm.title.length > 100) {
      toast.error('Product title must be 100 characters or less');
      return false;
    }
    if (!editForm.description.trim()) {
      toast.error('Product description is required');
      return false;
    }
    if (editForm.description.length > 1000) {
      toast.error('Product description must be 1000 characters or less');
      return false;
    }
    if (!editForm.productUrl.trim()) {
      toast.error('Product URL is required');
      return false;
    }
    try {
      new URL(editForm.productUrl);
    } catch {
      toast.error('Please enter a valid product URL');
      return false;
    }
    if (!editForm.price.trim()) {
      toast.error('Product price is required');
      return false;
    }
    const priceValue = parseFloat(editForm.price.replace(/[^0-9.-]/g, ''));
    if (isNaN(priceValue) || priceValue < 0) {
      toast.error('Please enter a valid price');
      return false;
    }
    return true;
  };

  const formatPrice = (price: string, currency: string): string => {
    const currencyInfo = currencies.find(c => c.code === currency);
    const symbol = currencyInfo?.symbol || '$';
    const numericPrice = parseFloat(price.replace(/[^0-9.-]/g, ''));
    
    if (isNaN(numericPrice)) return price;
    
    return `${symbol}${numericPrice.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const handleAddVideo = async () => {
    if (!validateForm()) return;
    
    if (!videoFile || !thumbnailFile) {
      toast.error('Please select both video and thumbnail files');
      return;
    }

    setUploading(true);
    try {
      const { videoUrl, thumbnailUrl, imageUrls } = await uploadFiles();

      const videosRef = ref(database, 'videoProducts');
      const newVideoRef = push(videosRef);
      
      // Convert imageUrls array to object
      const imagesObject = imageUrls.reduce((acc, img) => {
        acc[img.imageId] = img;
        return acc;
      }, {} as { [key: string]: ProductImage });

      const videoData: VideoProduct = {
        ...editForm,
        productId: newVideoRef.key!,
        videoUrl,
        thumbnailUrl,
        images: imagesObject,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await set(newVideoRef, videoData);
      setVideos(prev => ({ ...prev, [newVideoRef.key!]: videoData }));

      resetForm();
      toast.success('Video product added successfully!');
    } catch (error: any) {
      toast.error(`Failed to add video: ${error.message}`);
    } finally {
      setUploading(false);
      setVideoUploadProgress(0);
      setThumbnailUploadProgress(0);
      setImageUploadProgress({});
    }
  };

  const handleEditVideo = (id: string) => {
    setEditingId(id);
    setEditForm({ ...videos[id] });
  };

  const handleSaveEdit = async () => {
    if (!validateForm()) return;

    setUploading(true);
    try {
      let updatedData = { ...editForm, updatedAt: Date.now() };

      // Upload new files if selected
      if (videoFile || thumbnailFile || imageFiles.length > 0) {
        if (videoFile && thumbnailFile) {
          const { videoUrl, thumbnailUrl, imageUrls } = await uploadFiles();
          updatedData.videoUrl = videoUrl;
          updatedData.thumbnailUrl = thumbnailUrl;
          
          // Add new images to existing ones
          const existingImages = updatedData.images || {};
          const newImagesObject = imageUrls.reduce((acc, img) => {
            acc[img.imageId] = img;
            return acc;
          }, {} as { [key: string]: ProductImage });
          
          updatedData.images = { ...existingImages, ...newImagesObject };
        } else if (imageFiles.length > 0) {
          // Only upload new images
          const imageUrls: ProductImage[] = [];
          for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const imageUrl = await uploadFileToS3(
              file,
              'product-images',
              (progress) => {
                setImageUploadProgress(prev => ({
                  ...prev,
                  [`image_${i}`]: progress.percentage
                }));
              }
            );

            imageUrls.push({
              imageId: `img_${Date.now()}_${i}`,
              imageUrl,
              caption: '',
              isPrimary: false,
              uploadedAt: Date.now()
            });
          }

          const existingImages = updatedData.images || {};
          const newImagesObject = imageUrls.reduce((acc, img) => {
            acc[img.imageId] = img;
            return acc;
          }, {} as { [key: string]: ProductImage });
          
          updatedData.images = { ...existingImages, ...newImagesObject };
        } else {
          toast.error('Please select both video and thumbnail files when updating video files');
          return;
        }
      }

      const videoRef = ref(database, `videoProducts/${editingId}`);
      await set(videoRef, updatedData);

      setVideos(prev => ({ ...prev, [editingId!]: updatedData }));
      setEditingId(null);
      resetForm();
      toast.success('Video updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update video: ${error.message}`);
    } finally {
      setUploading(false);
      setVideoUploadProgress(0);
      setThumbnailUploadProgress(0);
      setImageUploadProgress({});
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      try {
        const videoRef = ref(database, `videoProducts/${id}`);
        await remove(videoRef);

        const updatedVideos = { ...videos };
        delete updatedVideos[id];
        setVideos(updatedVideos);

        toast.success('Video deleted successfully!');
      } catch (error: any) {
        toast.error(`Failed to delete video: ${error.message}`);
      }
    }
  };

  const handleDeleteImage = async (productId: string, imageId: string) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      try {
        const updatedProduct = { ...videos[productId] };
        delete updatedProduct.images[imageId];
        updatedProduct.updatedAt = Date.now();

        const videoRef = ref(database, `videoProducts/${productId}`);
        await set(videoRef, updatedProduct);

        setVideos(prev => ({ ...prev, [productId]: updatedProduct }));
        toast.success('Image deleted successfully!');
      } catch (error: any) {
        toast.error(`Failed to delete image: ${error.message}`);
      }
    }
  };

  const handleSetPrimaryImage = async (productId: string, imageId: string) => {
    try {
      const updatedProduct = { ...videos[productId] };
      
      // Set all images to non-primary
      Object.keys(updatedProduct.images).forEach(id => {
        updatedProduct.images[id].isPrimary = false;
      });
      
      // Set selected image as primary
      updatedProduct.images[imageId].isPrimary = true;
      updatedProduct.updatedAt = Date.now();

      const videoRef = ref(database, `videoProducts/${productId}`);
      await set(videoRef, updatedProduct);

      setVideos(prev => ({ ...prev, [productId]: updatedProduct }));
      toast.success('Primary image updated!');
    } catch (error: any) {
      toast.error(`Failed to update primary image: ${error.message}`);
    }
  };

  const resetForm = () => {
    setEditForm({
      title: '',
      description: '',
      productUrl: '',
      videoUrl: '',
      thumbnailUrl: '',
      price: '',
      currency: 'USD',
      images: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setVideoFile(null);
    setThumbnailFile(null);
    setImageFiles([]);
    setShowAddForm(false);
    setEditingId(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    if (imagesInputRef.current) imagesInputRef.current.value = '';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProductImages = (product: VideoProduct): ProductImage[] => {
    return Object.values(product.images || {}).sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.uploadedAt - b.uploadedAt;
    });
  };

  const openImageModal = (productId: string, imageIndex: number) => {
    setViewingGallery(productId);
    setCurrentImageIndex(imageIndex);
    setShowImageModal(true);
  };

  const nextImage = () => {
    if (viewingGallery) {
      const images = getProductImages(videos[viewingGallery]);
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (viewingGallery) {
      const images = getProductImages(videos[viewingGallery]);
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
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
          <Video className="w-6 h-6 text-purple-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Video Products</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            {Object.keys(videos).length} videos
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Video
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search videos by title, description, or price..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'price')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
              <option value="price">Sort by Price</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add Video Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Add New Video Product</h3>
          
          {/* File Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video File * (.mp4, .mov, .avi - Max 100MB)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo"
                  onChange={handleVideoFileSelect}
                  className="hidden"
                />
                {videoFile ? (
                  <div className="space-y-2">
                    <Video className="w-8 h-8 mx-auto text-purple-600" />
                    <p className="text-sm font-medium text-gray-900">{videoFile.name}</p>
                    <p className="text-xs text-gray-600">{formatFileSize(videoFile.size)}</p>
                    {videoUploadProgress > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${videoUploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-gray-400" />
                    <p className="text-sm text-gray-600">Click to upload video</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  {videoFile ? 'Change Video' : 'Select Video'}
                </button>
              </div>
            </div>

            {/* Thumbnail Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thumbnail Image * (.jpg, .png, .webp - Max 5MB)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleThumbnailFileSelect}
                  className="hidden"
                />
                {thumbnailFile ? (
                  <div className="space-y-2">
                    <ImageIcon className="w-8 h-8 mx-auto text-purple-600" />
                    <p className="text-sm font-medium text-gray-900">{thumbnailFile.name}</p>
                    <p className="text-xs text-gray-600">{formatFileSize(thumbnailFile.size)}</p>
                    {thumbnailUploadProgress > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${thumbnailUploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-gray-400" />
                    <p className="text-sm text-gray-600">Click to upload thumbnail</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  {thumbnailFile ? 'Change Thumbnail' : 'Select Thumbnail'}
                </button>
              </div>
            </div>
          </div>

          {/* Additional Images Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Product Images (Optional - Max 10 images, 5MB each)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
              <input
                ref={imagesInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageFilesSelect}
                className="hidden"
              />
              {imageFiles.length > 0 ? (
                <div className="space-y-3">
                  <Grid className="w-8 h-8 mx-auto text-purple-600" />
                  <p className="text-sm font-medium text-gray-900">{imageFiles.length} images selected</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                    {imageFiles.map((file, index) => (
                      <div key={index} className="text-xs bg-gray-100 p-2 rounded">
                        <p className="truncate">{file.name}</p>
                        <p className="text-gray-500">{formatFileSize(file.size)}</p>
                        {imageUploadProgress[`image_${index}`] > 0 && (
                          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                            <div
                              className="bg-purple-600 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${imageUploadProgress[`image_${index}`]}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Grid className="w-8 h-8 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">Click to upload additional images</p>
                  <p className="text-xs text-gray-500">Multiple selection supported</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => imagesInputRef.current?.click()}
                className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              >
                {imageFiles.length > 0 ? 'Change Images' : 'Select Images'}
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Title * (Max 100 characters)
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Enter product title"
              />
              <p className="text-xs text-gray-500 mt-1">{editForm.title.length}/100 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product URL *
              </label>
              <input
                type="url"
                value={editForm.productUrl}
                onChange={(e) => setEditForm(prev => ({ ...prev, productUrl: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="https://example.com/product"
              />
            </div>

            {/* Price and Currency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Price *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={editForm.price}
                    onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="99.99"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency *
                </label>
                <select
                  value={editForm.currency}
                  onChange={(e) => setEditForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {currencies.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} ({currency.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Description * (Max 1000 characters)
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                maxLength={1000}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Enter detailed product description..."
              />
              <p className="text-xs text-gray-500 mt-1">{editForm.description.length}/1000 characters</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleAddVideo}
              disabled={uploading || !videoFile || !thumbnailFile}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {uploading ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : 'Add Video'}
            </button>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(filteredVideos).map(([id, video]) => {
          const productImages = getProductImages(video);
          
          return (
            <div key={id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {editingId === id ? (
                <div className="p-6 space-y-4">
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Product title"
                  />
                  <input
                    type="url"
                    value={editForm.productUrl}
                    onChange={(e) => setEditForm(prev => ({ ...prev, productUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Product URL"
                  />
                  
                  {/* Price and Currency Edit */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editForm.price}
                      onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Price"
                    />
                    <select
                      value={editForm.currency}
                      onChange={(e) => setEditForm(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      {currencies.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    maxLength={1000}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Product description"
                  />

                  {/* File Update Section */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Update Files (Optional)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                      >
                        {videoFile ? 'Video Selected' : 'Change Video'}
                      </button>
                      <button
                        type="button"
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                      >
                        {thumbnailFile ? 'Thumbnail Selected' : 'Change Thumbnail'}
                      </button>
                      <button
                        type="button"
                        onClick={() => imagesInputRef.current?.click()}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                      >
                        {imageFiles.length > 0 ? `${imageFiles.length} Images` : 'Add Images'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
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
                <>
                  {/* Video Thumbnail */}
                  <div className="relative aspect-video bg-gray-100">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                      VIDEO
                    </div>
                    {productImages.length > 0 && (
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                        +{productImages.length} images
                      </div>
                    )}
                    {/* Price Badge */}
                    {video.price && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-sm font-semibold">
                        {formatPrice(video.price, video.currency)}
                      </div>
                    )}
                  </div>

                  {/* Product Images Gallery */}
                  {productImages.length > 0 && (
                    <div className="p-3 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Product Images ({productImages.length})</h4>
                        <button
                          onClick={() => setViewingGallery(viewingGallery === id ? null : id)}
                          className="text-xs text-purple-600 hover:text-purple-800"
                        >
                          {viewingGallery === id ? 'Hide' : 'View All'}
                        </button>
                      </div>
                      
                      {viewingGallery === id ? (
                        <div className="grid grid-cols-3 gap-2">
                          {productImages.map((image, index) => (
                            <div key={image.imageId} className="relative group">
                              <img
                                src={image.imageUrl}
                                alt={`Product ${index + 1}`}
                                className="w-full h-16 object-cover rounded cursor-pointer"
                                onClick={() => openImageModal(id, index)}
                              />
                              {image.isPrimary && (
                                <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
                                  Primary
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="flex gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSetPrimaryImage(id, image.imageId);
                                    }}
                                    className="p-1 bg-white rounded text-xs"
                                    title="Set as primary"
                                  >
                                    <Star className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteImage(id, image.imageId);
                                    }}
                                    className="p-1 bg-red-500 text-white rounded text-xs"
                                    title="Delete image"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto">
                          {productImages.slice(0, 4).map((image, index) => (
                            <img
                              key={image.imageId}
                              src={image.imageUrl}
                              alt={`Product ${index + 1}`}
                              className="w-12 h-12 object-cover rounded cursor-pointer flex-shrink-0"
                              onClick={() => openImageModal(id, index)}
                            />
                          ))}
                          {productImages.length > 4 && (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-600 flex-shrink-0">
                              +{productImages.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">{video.title}</h3>
                      {video.price && (
                        <div className="ml-3 text-lg font-bold text-green-600">
                          {formatPrice(video.price, video.currency)}
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{video.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(video.createdAt)}
                      </div>
                      {video.updatedAt !== video.createdAt && (
                        <div>Updated: {formatDate(video.updatedAt)}</div>
                      )}
                    </div>

                    <div className="flex gap-2 mb-4">
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center px-3 py-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 text-sm"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Watch Video
                      </a>
                      <a
                        href={video.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-sm"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Product
                      </a>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditVideo(id)}
                        className="flex-1 flex items-center justify-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteVideo(id)}
                        className="flex-1 flex items-center justify-center px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {Object.keys(filteredVideos).length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            {searchTerm ? (
              <>
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No videos found matching "{searchTerm}"</p>
                <p className="text-sm">Try a different search term</p>
              </>
            ) : (
              <>
                <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No video products added yet</p>
                <p className="text-sm">Add your first video product above</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && viewingGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="w-8 h-8" />
            </button>
            
            {getProductImages(videos[viewingGallery]).length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
            
            <img
              src={getProductImages(videos[viewingGallery])[currentImageIndex]?.imageUrl}
              alt="Product"
              className="max-w-full max-h-full object-contain"
            />
            
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
              {currentImageIndex + 1} / {getProductImages(videos[viewingGallery]).length}
            </div>
          </div>
        </div>
      )}

      {/* S3 Configuration Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">AWS S3 Configuration Required</p>
            <p>Make sure your S3 settings are configured in the S3 Settings page before uploading videos and images. All files will be stored securely in your S3 bucket.</p>
          </div>
        </div>
      </div>

      {/* Hidden file inputs for editing */}
      <input
        ref={videoInputRef}
        type="file"
        accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo"
        onChange={handleVideoFileSelect}
        className="hidden"
      />
      <input
        ref={thumbnailInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleThumbnailFileSelect}
        className="hidden"
      />
      <input
        ref={imagesInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        multiple
        onChange={handleImageFilesSelect}
        className="hidden"
      />
    </div>
  );
};