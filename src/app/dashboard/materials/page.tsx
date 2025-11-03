
'use client';

import Image from 'next/image';
import { Download, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages, type ImagePlaceholder } from '@/lib/placeholder-images';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

type GroupedMaterials = {
  [key: string]: ImagePlaceholder[];
};

export default function MaterialsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredMaterials = PlaceHolderImages.filter(material =>
    material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedMaterials = filteredMaterials.reduce((acc, material) => {
    const { category } = material;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(material);
    return acc;
  }, {} as GroupedMaterials);

  const categoryOrder = [
    'Business Profile',
    'Creative Assets',
    'Explainer Videos',
    'Testimonials / Clients / Social Proof',
  ];
  
  const hasResults = filteredMaterials.length > 0;

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
                    <Card key={material.id}>
                      <CardHeader className="p-0">
                        <Image
                            alt={material.description}
                            className="aspect-video w-full rounded-t-lg object-cover"
                            height="300"
                            src={material.imageUrl}
                            width="400"
                            data-ai-hint={material.imageHint}
                          />
                      </CardHeader>
                      <CardContent className="p-4 space-y-1">
                        <CardTitle className="text-base font-medium leading-tight">{material.title}</CardTitle>
                        <CardDescription className="text-sm">{material.description}</CardDescription>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button className="w-full">
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
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
    </div>
  );
}
