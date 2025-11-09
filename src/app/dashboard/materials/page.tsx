
'use client';

import Image from 'next/image';
import { Download, Search, Eye, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [activeViewer, setActiveViewer] = useState<{ category: string, index: number } | null>(null);
  
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
    'Creative Assets',
    'Explainer Videos',
    'Testimonials / Clients / Social Proof',
  ];
  
  const hasResults = filteredMaterials.length > 0;

  const handleShare = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link Copied!',
      description: 'The material link has been copied to your clipboard.',
    });
  };

  const handleDownload = (imageUrl: string, title: string) => {
    fetch(imageUrl)
      .then(response => response.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const fileExtension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
        link.download = `${title.replace(/ /g, '_')}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Download Started', description: `Downloading ${title}.` });
      })
      .catch(() => toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not download the image.' }));
  };

  const handleNext = () => {
    if (!activeViewer) return;
    const categoryItems = groupedMaterials[activeViewer.category];
    if (categoryItems) {
      const nextIndex = (activeViewer.index + 1) % categoryItems.length;
      setActiveViewer({ ...activeViewer, index: nextIndex });
    }
  }

  const handlePrev = () => {
    if (!activeViewer) return;
    const categoryItems = groupedMaterials[activeViewer.category];
    if (categoryItems) {
      const prevIndex = (activeViewer.index - 1 + categoryItems.length) % categoryItems.length;
      setActiveViewer({ ...activeViewer, index: prevIndex });
    }
  }

  const currentMaterial = activeViewer ? groupedMaterials[activeViewer.category]?.[activeViewer.index] : null;

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
                  {groupedMaterials[category].map((material, index) => (
                    <Card key={material.id} className="flex flex-col">
                      <CardHeader className="p-0">
                         <div className="relative aspect-video w-full rounded-t-lg overflow-hidden bg-muted flex items-center justify-center">
                            {material.type === 'pdf' ? (
                                <div className="text-center p-4">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/><path d="M10.25 18c.41 0 .75-.34.75-.75v-3.5c0-.41-.34-.75-.75-.75s-.75.34-.75.75v3.5c0 .41.34.75.75.75zm-2-3c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1s-1-.45-1-1v-2zm-1 4c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1v4zm8.5-3H15v-1h.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-2c-.28 0-.5.22-.5.5s.22.5.5.5H14v1h-.5c-.28 0-.5.22-.5.5s.22.5.5.5h2c.28 0 .5-.22.5-.5s-.22-.5-.5-.5zm-2.5-3.5c.55 0 1-.45 1-1V12c0-.55-.45-1-1-1s-1 .45-1 1v1.5c0 .55.45 1 1 1z"/></svg>
                                  <p className="text-xs font-semibold text-muted-foreground mt-2">PDF Document</p>
                                </div>
                            ) : (
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
                                    <Button variant="ghost" size="icon" onClick={() => setActiveViewer({ category, index })}>
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
                                <TooltipContent><p>Share</p></TooltipContent>
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
                  <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 z-10" onClick={handlePrev}><ChevronLeft/></Button>
                  {currentMaterial.type === 'pdf' ? (
                       <div className="w-full h-full flex items-center justify-center">
                          <iframe src={currentMaterial.imageUrl} className="w-full h-full border-0" title={currentMaterial.title}></iframe>
                       </div>
                  ) : (
                      <Image
                          alt={currentMaterial.description}
                          src={currentMaterial.imageUrl}
                          fill
                          className="object-contain"
                      />
                  )}
                  <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 z-10" onClick={handleNext}><ChevronRight/></Button>
              </div>
               <DialogFooter className="!justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                        Viewing {activeViewer!.index + 1} of {groupedMaterials[activeViewer!.category].length} in {activeViewer!.category}
                    </p>
                    <div className="flex gap-2">
                         <Button variant="outline" onClick={() => handleShare(currentMaterial.imageUrl)}>
                            <Share2 className="mr-2 h-4 w-4" /> Share Link
                        </Button>
                        <Button onClick={() => handleDownload(currentMaterial.imageUrl, currentMaterial.title)}>
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
