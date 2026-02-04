import { LegalPageLayout, LegalSection } from "@/components/legal";

const PatentNotice = () => {
  return (
    <LegalPageLayout
      title="Patent Notice"
      summary="Information about Music Exclusive's proprietary systems and intellectual property protections."
    >
      <LegalSection number="01" title="Patent Pending Status" showDivider={false}>
        <p>
          Music Exclusive™ is patent pending.
        </p>
        <p>
          The Music Exclusive platform includes proprietary systems, user flows, access controls, 
          and exclusive music distribution features that are protected under pending patent applications.
        </p>
        <p>
          Unauthorized copying, reproduction, or commercial imitation of the Music Exclusive platform 
          experience, including its exclusive access model, may be prohibited.
        </p>
        <p className="font-medium text-foreground">
          All rights are reserved.
        </p>
      </LegalSection>

      <div className="mt-10 pt-6 border-t border-border/30">
        <p className="text-sm text-muted-foreground text-center">
          Music Exclusive™ | Patent Pending
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default PatentNotice;
