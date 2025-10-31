
function ContractSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="space-y-4 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export function ContractText() {
    return (
        <>
            <ContractSection title="1. Purpose">
                <p>
                  This Agreement governs the prepaid water supply subscription service delivered through Smart Refill’s automated system and partner refill stations.
                </p>
            </ContractSection>

            <ContractSection title="2. Service Overview">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Scheduled and automated water deliveries through verified local partner refill stations.</li>
                  <li>Water compliant with DOH, DENR, and FDA standards.</li>
                  <li>Usage tracking, scheduling, and roll-over management via the Smart Refill platform.</li>
                  <li>Monthly consumption and compliance reports for operational monitoring and transparency.</li>
                </ul>
            </ContractSection>

            <ContractSection title="3. Subscription Plans">
                <ul className="list-disc pl-5 space-y-1">
                    <li>Clients may subscribe under any active Smart Refill™ plan (Micro, Starter, Pro, Business, Enterprise+, or Unlimited+).</li>
                    <li>Each plan includes a defined number of liters per month, optional roll-over (2 months), and a fixed prepaid fee.</li>
                    <li>Additional liters beyond plan limits are billed at the plan’s add-on rate.</li>
                </ul>
            </ContractSection>

            <ContractSection title="4. Delivery & Refills">
                <ul className="list-disc pl-5 space-y-1">
                    <li>Water is delivered automatically based on usage data or refill schedules set in the Smart Refill™ system.</li>
                    <li>Deliveries are performed by accredited local partner refill stations under the Smart Refill™ network.</li>
                    <li>Delivery schedules may be adjusted by Smart Refill™ for operational efficiency and service reliability.</li>
                </ul>
            </ContractSection>
            
            <ContractSection title="5. Equipment Use">
                <ul className="list-disc pl-5 space-y-1">
                    <li>Each plan includes free use of dispensers and bottles (quantity based on plan tier).</li>
                    <li>Equipment remains the property of River Tech Group, Inc.</li>
                    <li>If the Client exceeds included equipment limits, additional units may be provided as rentals.</li>
                    <li>The Client must maintain equipment in good condition and return or replace damaged items.</li>
                </ul>
            </ContractSection>

            <ContractSection title="6. Payment Terms">
                <ul className="list-disc pl-5 space-y-1">
                    <li>Subscriptions are prepaid monthly.</li>
                    <li>Payment covers the included liter allocation and any applicable service fees.</li>
                    <li>Unused liters roll over for up to two (2) consecutive months, after which they expire.</li>
                    <li>Payments are non-refundable after activation.</li>
                </ul>
            </ContractSection>

            <ContractSection title="7. Quality & Compliance">
                <p>
                    Smart Refill™ ensures all partner stations meet government-approved water safety and sanitation standards.
                </p>
                <p>
                    Periodic sampling and compliance monitoring are conducted to maintain quality assurance.
                </p>
            </ContractSection>

             <ContractSection title="8. Liability & Health Safety">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-foreground">1. Water Quality Assurance</h4>
                        <p>River Tech Group, Inc., through its Smart Refill™ network, ensures that all partner refill stations operate with valid permits and comply with the latest DOH, DENR, and FDA standards for potable water.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">2. Health-Related Incidents</h4>
                        <p>In the unlikely event of a verified contamination or water-borne health issue directly attributable to the supplied water, Smart Refill™ shall conduct an immediate quality investigation, replace the affected water volume at no additional cost, and cooperate with local health authorities.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">3. Limitation of Liability</h4>
                        <p>Smart Refill™ and River Tech Group, Inc. shall not be liable for issues resulting from improper storage, handling, or dispensing by the Client. The Provider’s total liability shall not exceed the total subscription amount paid by the Client within the past three (3) months.</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-foreground">4. Client Responsibilities</h4>
                        <p>The Client agrees to maintain clean and safe dispenser locations and promptly report any suspected quality issue.</p>
                    </div>
                </div>
            </ContractSection>

            <ContractSection title="9. Subscription Renewal, Suspension, and Termination">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-foreground">9.1 Auto-Renewal</h4>
                        <p>Subscriptions automatically renew unless cancelled by the Client at least 30 days prior to renewal.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">9.2 Cancellation by Client</h4>
                        <p>The Client may cancel with 30 days written notice. Prepaid amounts are non-refundable, and equipment must be returned in good condition.</p>
                    </div>
                    <div>
                         <h4 className="font-semibold text-foreground">9.3 Suspension by Smart Refill™</h4>
                        <p>Services may be suspended for non-payment, misuse, or breach of standards.</p>
                    </div>
                    <div>
                         <h4 className="font-semibold text-foreground">9.4 Termination by Smart Refill™</h4>
                        <p>Smart Refill™ may terminate the agreement for cause (e.g., material breach) or without cause with 30 days’ notice.</p>
                    </div>
                </div>
            </ContractSection>
            
            <ContractSection title="10. Data and Monitoring">
                <p>Operational data is used for service improvement and compliance reporting, in accordance with the Data Privacy Act of 2012.</p>
            </ContractSection>

             <ContractSection title="11. Trademarks & Ownership">
                <p>Smart Refill™ is a registered trademark of River Tech Group, Inc. All intellectual property remains with the Provider.</p>
            </ContractSection>

            <ContractSection title="12. Governing Law">
                <p>This Agreement is governed by the laws of the Republic of the Philippines.</p>
            </ContractSection>
        </>
    )
}
