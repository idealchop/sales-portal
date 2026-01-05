
'use client';

import React, { Suspense, useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, getDoc, collectionGroup, query, where, getDocs, FirestoreError } from 'firebase/firestore';
import { ContractDetails, type FinalPlanDetails } from '@/components/contract-details';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertTriangle, FileText, Download } from 'lucide-react';
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
            const linksQuery = query(
                collectionGroup(firestore, 'shareable_links'),
                where('id', '==', linkId)
            );
            
            try {
                const querySnapshot = await getDocs(linksQuery);

                if (querySnapshot.empty) {
                    throw new Error("This sharing link is invalid or has been removed.");
                }

                const linkDocSnap = querySnapshot.docs[0];
                const linkData = linkDocSnap.data();

                if (new Date(linkData.expiresAt) < new Date()) {
                    throw new Error("This sharing link has expired.");
                }

                const proposalDocRef = doc(firestore, `clients/${linkData.clientId}/proposals/${linkData.proposalId}`);
                const proposalDocSnap = await getDoc(proposalDocRef);

                if (!proposalDocSnap.exists()) {
                    throw new Error("The associated proposal could not be found.");
                }
                
                const proposalData = proposalDocSnap.data();
                if (proposalData.content) {
                    const finalDetails = JSON.parse(proposalData.content) as FinalPlanDetails;
                    setProposalDetails(finalDetails);
                } else {
                    throw new Error("Proposal content is missing or invalid.");
                }

            } catch (e: any) {
                 if (e instanceof FirestoreError && e.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: `shareable_links (collection group)`,
                        operation: 'list',
                    });
                    errorEmitter.emit('permission-error', permissionError);
                } else {
                    console.error("Error fetching shared proposal: ", e);
                    setError(e.message || "An unexpected error occurred.");
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchSharedProposal();
    }, [linkId, firestore]);
    
    const handleDownloadPdf = async () => {
        const element = proposalRef.current;
        if (!element || !proposalDetails) return;
        
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgHeight = canvas.height * pdfWidth / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = -pdfHeight * (pdf.internal.getNumberOfPages());
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

             const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor(150);
                pdf.text(
                    `Page ${i} of ${totalPages} | Smart Refill Proposal`,
                    pdf.internal.pageSize.getWidth() / 2,
                    pdf.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }
            
            pdf.save(`Smart-Refill-Proposal-${proposalDetails.companyName}.pdf`);
            toast({ title: "Download Started", description: "Your proposal PDF is being generated." });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate PDF.' });
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
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="text-primary"/>
                                Proposal for {proposalDetails.companyName}
                            </CardTitle>
                            <CardDescription>
                                This is a read-only view of the proposal. You can download it as a PDF.
                            </CardDescription>
                        </div>
                        <Button onClick={handleDownloadPdf} disabled={isDownloading}>
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Download PDF
                        </Button>
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
