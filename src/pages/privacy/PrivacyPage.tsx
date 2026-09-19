import { LegalPage, type LegalSection } from "@/pages/legal/LegalPage";

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Scope",
    content: <><p>This policy explains how Blazemap handles personal information when you create an account, submit a forest or land fire observation, follow a report, or use an authorized government workspace.</p><p>Blazemap supports investigation and public information in Kalimantan. A community report, satellite hotspot, or AI assessment is not automatically a confirmed fire.</p></>,
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    content: <><h3>Account information</h3><p>We may store your name, email address, email-verification state, profile image, account role, account status, authentication method, and security-session information.</p><h3>Observation information</h3><p>When you submit a report, we may collect:</p><ul><li>the signs you observed, such as smoke, flames, or a burning smell;</li><li>the observation time and your description;</li><li>an estimated incident location or your observer position;</li><li>location accuracy and a verified administrative region, when available;</li><li>optional photographs and later clarification or progress information.</li></ul><h3>Technical and security information</h3><p>Authentication and security systems may process session identifiers, IP address, user agent, request timing, and audit records needed to protect the service and investigate misuse.</p></>,
  },
  {
    id: "how-we-use-information",
    title: "How we use information",
    content: <><p>We use information to:</p><ul><li>receive and display your reports to you;</li><li>help authorized reviewers assess which indications may need attention;</li><li>connect related reports, satellite observations, field evidence, weather context, and cases;</li><li>request clarification and record report progress;</li><li>protect accounts, prevent abuse, and maintain an auditable operational history;</li><li>prepare privacy-reviewed public information when authorized.</li></ul><p>Submitting a report does not confirm a fire, dispatch a team, or guarantee an emergency response.</p></>,
  },
  {
    id: "location-and-photos",
    title: "Location and photographs",
    content: <><p>Location can be sensitive. Blazemap distinguishes an estimated incident location from an observer position. Authorized reviewers can access the location supplied with a private report.</p><p>Original report photographs are private evidence. They are not automatically placed in public News. A separate reviewed derivative and explicit publication approval are required before media can be published.</p><p>Never move closer to smoke or flames to collect a location or photograph.</p></>,
  },
  {
    id: "ai-processing",
    title: "AI-assisted analysis",
    content: <><p>Blazemap may send a limited, structured case context to a configured Gemini service to help organize evidence, summarize uncertainty, and suggest investigation priority.</p><p>The AI context omits reporter identity, account details, original photographs, and free-text narratives. Community reports are represented using limited fields such as observation type, time, location mode, and an incident-estimate coordinate when appropriate.</p><p>AI output is advisory. It cannot confirm a fire, publish an official warning, dispatch a team, or order an evacuation.</p></>,
  },
  {
    id: "sharing-and-publication",
    title: "Sharing and publication",
    content: <><p>Private reports may be accessed by the report owner and authorized government reviewers. Service providers may process data only as needed to operate authentication, hosting, storage, email, mapping, weather, satellite ingestion, and AI analysis.</p><p>Public information is a separate, reviewed record. Blazemap does not automatically copy reporter identity, private descriptions, or original evidence into public content. Public location may be withheld, limited to a region, or based on an explicitly approved incident point or perimeter.</p></>,
  },
  {
    id: "retention",
    title: "Retention and deletion",
    content: <><p>Blazemap retains account, report, evidence, verification, publication, and audit records while they are needed for service operation, security, reviewability, and applicable obligations.</p><p>Uploads that expire before being attached to a report or other record are eligible for automated cleanup. Attached evidence and operational history are not currently governed by a published fixed deletion schedule.</p><p>A formal retention schedule and deletion-request procedure require operator and legal approval. Until those are published, do not assume that submitted reports or attached evidence will be deleted after a specific period.</p></>,
  },
  {
    id: "security",
    title: "Security",
    content: <><p>Blazemap uses authenticated sessions, role checks, email verification, private evidence access controls, audit logs, rate limits, origin checks, transport security, and restricted upload types. No system can guarantee absolute security.</p><p>Keep your account credentials private and sign out on shared devices. Contact the operator if you believe your account or submitted information has been accessed improperly.</p></>,
  },
  {
    id: "choices-and-rights",
    title: "Your choices and rights",
    content: <><p>You can review your own submitted reports and update supported profile information through your account. Requests concerning access, correction, deletion, or objection must be assessed against operational, security, audit, and legal requirements.</p><p>Do not use public channels to send passwords, private evidence, or precise sensitive location information. Use the verified contact channel when one is published on the <a href="/contact">Contact page</a>.</p></>,
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: <><p>We may revise this policy as Blazemap, its integrations, or applicable requirements change. The date at the top identifies the current version. Material operational changes should be reviewed before publication.</p></>,
  },
];

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" summary="How Blazemap handles account information, community observations, location data, photographs, and AI-assisted case context." updated="19 September 2026" notice="This policy describes the current product implementation. Formal operator identity, retention periods, deletion procedures, and jurisdiction-specific legal terms still require owner and legal approval before production launch." sections={sections} />;
}
