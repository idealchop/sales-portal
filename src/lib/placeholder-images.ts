
import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageUrls?: string[];
  imageHint: string;
  category: string;
  type: 'image' | 'pdf' | 'gallery' | 'video';
};

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;

    
