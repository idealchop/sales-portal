
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Copy, Download, Eye, History, Trash2, Lightbulb } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { generateSocialPost } from '@/ai/flows/generate-social-post';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  topic: z.string().min(10, 'Please describe the topic in at least 10 characters.'),
  style: z.string().min(1, 'Please select a style for the post.'),
});

type SocialPostFormValues = z.infer<typeof formSchema>;

type GeneratedContent = {
  caption: string;
  imageUrl: string;
  topic: string;
  style: string;
  timestamp: string;
};

const contentSuggestions = [
    "A new case study showing how Smart Refill saved a client 20% on water costs.",
    "The convenience of automated water delivery for busy offices.",
    "Our commitment to water safety and compliance standards.",
    "A behind-the-scenes look at our delivery network.",
    "Highlighting a positive customer testimonial."
]

export default function ContentStudioPage() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [history, setHistory] = useState<GeneratedContent[]>([]);
  const [activeTab, setActiveTab] = useState("create");

  const form = useForm<SocialPostFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      style: 'professional',
    },
  });

  const handleGenerate = async (values: SocialPostFormValues) => {
    setIsGenerating(true);
    setGeneratedContent(null);
    setActiveTab("preview"); 
    try {
      const result = await generateSocialPost(values);
      const newContent: GeneratedContent = {
        ...result,
        topic: values.topic,
        style: values.style,
        timestamp: new Date().toLocaleString(),
      }
      setGeneratedContent(newContent);
      setHistory(prev => [newContent, ...prev]);
      toast({
        title: 'Content Generated!',
        description: 'Your new social media post is ready for review.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'There was an error generating the content. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'social-post-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Image downloaded!' });
  };

  const handleClearHistory = () => {
    setHistory([]);
    toast({
        title: 'History Cleared',
        description: 'Your content generation history has been cleared.',
    });
  }

  const handleSuggestionClick = (suggestion: string) => {
    form.setValue('topic', suggestion);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Content Studio</h1>
        <p className="text-muted-foreground">
          Generate engaging social media posts with the power of AI.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">1. Create</TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedContent && !isGenerating}>2. Preview</TabsTrigger>
            <TabsTrigger value="history">3. History</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
            <Card>
                <CardHeader>
                    <CardTitle>Create a Post</CardTitle>
                    <CardDescription>
                        Describe your post, select a tone, and let AI do the rest.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="topic"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Post Topic</FormLabel>
                                <FormControl>
                                <Textarea
                                    {...field}
                                    placeholder="e.g., A new case study showing how Smart Refill saved a client 20% on water costs."
                                    className="min-h-[120px]"
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <Alert>
                            <Lightbulb className="h-4 w-4" />
                            <AlertTitle>Need inspiration?</AlertTitle>
                            <AlertDescription>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    {contentSuggestions.map((suggestion, index) => (
                                        <li key={index} className="text-sm">
                                            <button type="button" onClick={() => handleSuggestionClick(suggestion)} className="text-left hover:underline">
                                                {suggestion}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                        <FormField
                            control={form.control}
                            name="style"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tone of Voice</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select a style" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="professional">Professional</SelectItem>
                                    <SelectItem value="friendly">Friendly</SelectItem>
                                    <SelectItem value="witty">Witty</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                    <SelectItem value="inspirational">Inspirational</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isGenerating} className="w-full bg-gradient-to-r from-primary to-[#3ab7b1] hover:from-primary/90 hover:to-[#36a6a0] text-primary-foreground font-bold transition-all duration-300 hover:shadow-lg hover:scale-105">
                            {isGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Generate Content
                        </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="preview">
            <Card className="min-h-[600px]">
                <CardHeader>
                <CardTitle>Generated Preview</CardTitle>
                <CardDescription>
                    Review your latest AI-generated content below.
                </CardDescription>
                </CardHeader>
                <CardContent>
                {isGenerating && (
                    <div className="flex flex-col items-center justify-center gap-4 text-center h-96">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Generating your content... this may take a moment.</p>
                    </div>
                )}
                {!isGenerating && !generatedContent && (
                    <div className="flex flex-col items-center justify-center gap-4 text-center h-96 border-2 border-dashed rounded-lg">
                    <Sparkles className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">Your generated content will appear here once it's ready.</p>
                    </div>
                )}
                {generatedContent && (
                    <div className="space-y-6">
                    <Card>
                        <CardHeader>
                        <CardTitle className="text-lg">Generated Image</CardTitle>
                        </CardHeader>
                        <CardContent className="relative aspect-video w-full overflow-hidden rounded-lg">
                        <Image
                            src={generatedContent.imageUrl}
                            alt="Generated social media image"
                            fill
                            className="object-cover"
                        />
                        </CardContent>
                        <CardFooter>
                        <Button variant="outline" onClick={() => handleDownload(generatedContent.imageUrl)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Image
                        </Button>
                        </CardFooter>
                    </Card>
                    <Card>
                        <CardHeader>
                        <CardTitle className="text-lg">Generated Caption</CardTitle>
                        </CardHeader>
                        <CardContent>
                        <div className="prose dark:prose-invert text-sm whitespace-pre-wrap rounded-md bg-muted p-4">
                            {generatedContent.caption}
                        </div>
                        </CardContent>
                        <CardFooter>
                        <Button variant="outline" onClick={() => handleCopy(generatedContent.caption)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Caption
                        </Button>
                        </CardFooter>
                    </Card>
                    </div>
                )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="history">
            {history.length > 0 ? (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                <CardTitle>Generation History</CardTitle>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleClearHistory}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear History
                            </Button>
                        </div>
                        <CardDescription>
                            Review and reuse your previously generated posts.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {history.map((item, index) => (
                            <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex-1 overflow-hidden">
                                    <p className="truncate text-sm font-medium">{item.topic}</p>
                                    <p className="text-xs text-muted-foreground">{item.timestamp}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                     <DialogContent className="sm:max-w-3xl">
                                        <DialogHeader>
                                            <DialogTitle>Generated Content Preview</DialogTitle>
                                            <DialogDescription>
                                                Review the full content generated on {item.timestamp}.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 max-h-[60vh] overflow-y-auto pr-4">
                                            <div>
                                                <h3 className="font-semibold mb-2">Generated Image</h3>
                                                <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                                                    <Image src={item.imageUrl} alt="Generated social media image" fill className="object-cover"/>
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold mb-2">Generated Caption</h3>
                                                <div className="prose dark:prose-invert text-sm whitespace-pre-wrap rounded-md bg-muted p-4 h-full">
                                                    {item.caption}
                                                </div>
                                            </div>
                                        </div>
                                         <CardFooter className="mt-4 flex justify-end gap-2">
                                            <Button variant="outline" onClick={() => handleDownload(item.imageUrl)}>
                                                <Download className="mr-2 h-4 w-4" />
                                                Download Image
                                            </Button>
                                            <Button variant="outline" onClick={() => handleCopy(item.caption)}>
                                                <Copy className="mr-2 h-4 w-4" />
                                                Copy Caption
                                            </Button>
                                        </CardFooter>
                                    </DialogContent>
                                </Dialog>
                                <Button variant="ghost" size="icon" onClick={() => handleCopy(item.caption)}><Copy className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDownload(item.imageUrl)}><Download className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ) : (
                <Card className="min-h-[600px]">
                    <CardHeader>
                        <CardTitle>No History</CardTitle>
                        <CardDescription>
                            Your generated content will appear here.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center gap-4 text-center h-96 border-2 border-dashed rounded-lg">
                          <History className="h-12 w-12 text-muted-foreground" />
                          <p className="text-muted-foreground">You haven't generated any content yet.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
