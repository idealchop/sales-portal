
'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ContractDetails, type FinalPlanDetails } from '@/components/contract-details';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertTriangle, FileText, Download, Mail, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

function SharedProposalContent() {
    const params = useParams();
    const linkId = params.linkId as string;
    const firestore = useFirestore();
    const { toast } = useToast();

    const [proposalDetails, setProposalDetails] = useState<FinalPlanDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const proposalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!linkId || !firestore) {
            setError("Invalid link provided.");
            setIsLoading(false);
            return;
        }

        const fetchSharedProposal = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                 const linkDocRef = doc(firestore, 'shareable_links', linkId);
                 const linkDocSnap = await getDoc(linkDocRef);

                 if (!linkDocSnap.exists()) {
                     throw new Error("This sharing link is invalid or has been removed.");
                 }

                 const linkData = linkDocSnap.data();
                
                if (linkData.content) {
                    const finalDetails = JSON.parse(linkData.content) as FinalPlanDetails;
                    setProposalDetails(finalDetails);
                } else {
                    throw new Error("Proposal content is missing or invalid.");
                }

            } catch (e: any) {
                 if (e.code === 'permission-denied') {
                    setError("You do not have permission to view this proposal. The link may be invalid or expired.");
                } else {
                    console.error("Error fetching shared proposal: ", e);
                    setError(e.message || "An unexpected error occurred while fetching the proposal.");
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchSharedProposal();
    }, [linkId, firestore]);

    const handleDownloadPDF = async () => {
        if (!proposalRef.current || !proposalDetails) return;

        setIsDownloading(true);
        try {
            const canvas = await html2canvas(proposalRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height],
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`proposal-${proposalDetails.proposalId || 'download'}.pdf`);
            
            toast({
                title: "Download Complete",
                description: "The proposal has been downloaded as a PDF.",
            });
        } catch (error) {
            console.error("Error generating PDF: ", error);
            toast({
                variant: "destructive",
                title: "Download Failed",
                description: "There was a problem generating the PDF. Please try again.",
            });
        } finally {
            setIsDownloading(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    if (error) {
        return (
            <Card className="w-full max-w-lg mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <CardTitle className="mt-4">Link Invalid or Expired</CardTitle>
                    <CardDescription>{error}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (proposalDetails) {
        return (
            <div className="w-full max-w-4xl mx-auto space-y-4">
                 <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl font-bold">{proposalDetails.companyName}</CardTitle>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 gap-2 text-sm text-muted-foreground pt-1">
                                    {proposalDetails.proposalId && (
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            <span className="font-mono">ID: {proposalDetails.proposalId}</span>
                                        </div>
                                    )}
                                    {proposalDetails.contactEmail && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            <span>{proposalDetails.contactEmail}</span>
                                        </div>
                                    )}
                                    {proposalDetails.date && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>Created: {proposalDetails.date}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button onClick={handleDownloadPDF} disabled={isDownloading}>
                                {isDownloading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                Download PDF
                            </Button>
                        </div>
                    </CardHeader>
                </Card>
                <div ref={proposalRef} className="bg-white p-8 rounded-lg shadow-lg">
                   <ContractDetails
                        finalPlanDetails={proposalDetails}
                        isSigned={true}
                        isProposalIllustration={true}
                    />
                </div>
            </div>
        );
    }

    return null;
}

export default function SharedProposalPage() {
    return (
        <Suspense fallback={<Loader2 className="h-12 w-12 animate-spin text-primary" />}>
            <SharedProposalContent />
        </Suspense>
    );
}
