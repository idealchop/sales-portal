
'use client';

import Image from 'next/image';
import { Download, Search, Eye, Share2, ChevronLeft, ChevronRight, Image as ImageIcon, File as FileIcon, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages, type ImagePlaceholder } from '@/lib/placeholder-images';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type GroupedMaterials = {
  [key: string]: ImagePlaceholder[];
};

export default function MaterialsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const [activeViewer, setActiveViewer] = useState<{ materialId: string; index: number } | null>(null);
  
  const filteredMaterials = useMemo(() => PlaceHolderImages.filter(material =>
    material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.description.toLowerCase().includes(searchQuery.toLowerCase())
  ), [searchQuery]);

  const groupedMaterials = useMemo(() => filteredMaterials.reduce((acc, material) => {
    const { category } = material;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(material);
    return acc;
  }, {} as GroupedMaterials), [filteredMaterials]);

  const categoryOrder = [
    'Business Profile',
    'Explainer Materials',
    'Video Tutorials',
    'Creative Assets',
  ];
  
  const hasResults = filteredMaterials.length > 0;

  const handleShare = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link Copied!',
      description: 'The material link has been copied to your clipboard.',
    });
  };

  const handleDownload = async (imageUrl: string, title: string) => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Network response was not ok.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileExtension = imageUrl.split('.').pop()?.split('?')[0] || 'download';
      link.setAttribute('download', `${title.replace(/ /g, '_')}.${fileExtension}`);
      
      document.body.appendChild(link);
      link.click();
      
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({ title: 'Download Started', description: `Downloading ${title}.` });
    } catch (error) {
      console.error('Download error:', error);
      toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not download the file.' });
    }
  };
  
  const currentMaterial = activeViewer ? filteredMaterials.find(m => m.id === activeViewer.materialId) : null;
  const currentImageIndex = activeViewer?.index || 0;
  const currentImageUrl = currentMaterial?.type === 'gallery' 
    ? currentMaterial.imageUrls?.[currentImageIndex] 
    : currentMaterial?.imageUrl;
    
  const handleNext = () => {
    if (!currentMaterial || currentMaterial.type !== 'gallery' || !currentMaterial.imageUrls) return;
    const nextIndex = (currentImageIndex + 1) % currentMaterial.imageUrls.length;
    setActiveViewer({ ...activeViewer!, index: nextIndex });
  }

  const handlePrev = () => {
    if (!currentMaterial || currentMaterial.type !== 'gallery' || !currentMaterial.imageUrls) return;
    const prevIndex = (currentImageIndex - 1 + currentMaterial.imageUrls.length) % currentMaterial.imageUrls.length;
    setActiveViewer({ ...activeViewer!, index: prevIndex });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Sales Materials</h1>
        <p className="text-muted-foreground">Your toolkit for success. Find presentations, brochures, and other assets.</p>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search materials..."
          className="pl-10 w-full max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {hasResults ? (
        <div className="space-y-8">
          {categoryOrder.map(category => (
            groupedMaterials[category] && (
              <div key={category}>
                <h2 className="text-xl font-semibold mb-4">{category}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {groupedMaterials[category].map((material) => (
                    <Card key={material.id} className="flex flex-col">
                      <CardHeader className="p-0">
                         <div className="relative aspect-video w-full rounded-t-lg overflow-hidden bg-muted flex items-center justify-center">
                            {material.type === 'pdf' && (
                                <div className="text-center p-4">
                                  <FileIcon className="h-16 w-16 text-red-500 mx-auto" />
                                  <p className="text-xs font-semibold text-muted-foreground mt-2">PDF Document</p>
                                </div>
                            )}
                             {material.type === 'video' && (
                                <div className="text-center p-4">
                                  <Video className="h-16 w-16 text-primary mx-auto" />
                                  <p className="text-xs font-semibold text-muted-foreground mt-2">Video Tutorial</p>
                                </div>
                            )}
                            {material.type === 'gallery' && (
                                <>
                                 <Image
                                    alt={material.description}
                                    className="aspect-video w-full object-cover"
                                    height="300"
                                    src={material.imageUrl}
                                    width="400"
                                    data-ai-hint={material.imageHint}
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                                    <div className="text-center">
                                        <ImageIcon className="h-12 w-12 mx-auto" />
                                        <p className="font-bold mt-2">Image Gallery</p>
                                        <p className="text-xs">{material.imageUrls?.length} images</p>
                                    </div>
                                </div>
                                </>
                            )}
                            {material.type === 'image' && (
                                <Image
                                    alt={material.description}
                                    className="aspect-video w-full object-cover"
                                    height="300"
                                    src={material.imageUrl}
                                    width="400"
                                    data-ai-hint={material.imageHint}
                                />
                            )}
                         </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-1 flex-1">
                        <CardTitle className="text-base font-medium leading-tight">{material.title}</CardTitle>
                        <CardDescription className="text-sm">{material.description}</CardDescription>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-end gap-1">
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setActiveViewer({ materialId: material.id, index: 0 })}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>View</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleShare(material.imageUrl)}>
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Share Link</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleDownload(material.imageUrl, material.title)}>
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Download</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 border-2 border-dashed rounded-lg">
            <Search className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Results Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
                Your search for "{searchQuery}" did not match any materials. Please try a different keyword.
            </p>
        </div>
      )}

      {currentMaterial && (
        <Dialog open={!!activeViewer} onOpenChange={(open) => !open && setActiveViewer(null)}>
          <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>{currentMaterial.title}</DialogTitle>
                  <DialogDescription>{currentMaterial.description}</DialogDescription>
              </DialogHeader>
              <div className="relative flex-1 flex items-center justify-center bg-muted/50 rounded-lg">
                  {currentMaterial.type === 'gallery' && (
                    <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/20 hover:bg-black/50 text-white" onClick={handlePrev}><ChevronLeft/></Button>
                  )}
                  
                  {currentMaterial.type === 'pdf' && currentImageUrl && (
                       <div className="w-full h-full flex items-center justify-center">
                          <iframe 
                            src={`https://docs.google.com/gview?url=${encodeURIComponent(currentImageUrl)}&embedded=true`} 
                            className="w-full h-full border-0" 
                            title={currentMaterial.title}
                          ></iframe>
                       </div>
                  )}

                  {currentMaterial.type === 'video' && currentImageUrl && (
                      <div className="w-full h-full flex items-center justify-center">
                           {currentImageUrl.includes('youtube.com') ? (
                                <iframe
                                    className="w-full h-full aspect-video"
                                    src={currentImageUrl}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                ></iframe>
                           ) : (
                                <video
                                    controls
                                    muted
                                    className="w-full h-full object-contain"
                                    src={currentImageUrl}
                                >
                                    Your browser does not support the video tag.
                                </video>
                           )}
                       </div>
                  )}
                  
                  {(currentMaterial.type === 'image' || currentMaterial.type === 'gallery') && currentImageUrl && (
                      <Image
                          alt={currentMaterial.description}
                          src={currentImageUrl}
                          fill
                          className="object-contain"
                      />
                  )}
                  
                  {currentMaterial.type === 'gallery' && (
                    <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/20 hover:bg-black/50 text-white" onClick={handleNext}><ChevronRight/></Button>
                  )}
              </div>
               <DialogFooter className="!justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                       {currentMaterial.type === 'gallery' 
                         ? `Image ${currentImageIndex + 1} of ${currentMaterial.imageUrls?.length}`
                         : currentMaterial.title
                       }
                    </p>
                    <div className="flex gap-2">
                         <Button variant="outline" onClick={() => handleShare(currentImageUrl!)}>
                            <Share2 className="mr-2 h-4 w-4" /> Share Link
                        </Button>
                        <Button onClick={() => handleDownload(currentImageUrl!, `${currentMaterial.title}${currentMaterial.type === 'gallery' ? `_${currentImageIndex + 1}`: ''}`)}>
                            <Download className="mr-2 h-4 w-4" /> Download
                        </Button>
                    </div>
                </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
