import Image from 'next/image';
import { File, Link as LinkIcon, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function MaterialsPage() {
  const materials = PlaceHolderImages;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Sales Materials</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {materials.map((material) => (
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
  );
}
