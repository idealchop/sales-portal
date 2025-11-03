import Image from 'next/image';
import { Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages, type ImagePlaceholder } from '@/lib/placeholder-images';
import { Separator } from '@/components/ui/separator';

type GroupedMaterials = {
  [key: string]: ImagePlaceholder[];
};

export default function MaterialsPage() {
  const materials = PlaceHolderImages;

  const groupedMaterials = materials.reduce((acc, material) => {
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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Sales Materials</h1>
        <p className="text-muted-foreground">Your toolkit for success. Find presentations, brochures, and other assets.</p>
      </div>
      
      <div className="space-y-8">
        {categoryOrder.map(category => (
          groupedMaterials[category] && (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-4">{category}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groupedMaterials[category].map((material) => (
                  <Card key={material.id}>
                    <CardHeader>
                      <Image
                          alt={material.description}
                          className="aspect-video w-full rounded-md object-cover"
                          height="300"
                          src={material.imageUrl}
                          width="400"
                          data-ai-hint={material.imageHint}
                        />
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-base font-medium leading-tight">{material.title}</CardTitle>
                      <CardDescription className="mt-1 text-sm">{material.description}</CardDescription>
                    </CardContent>
                    <CardFooter>
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
    </div>
  );
}
