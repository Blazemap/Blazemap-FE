import { LegalPage, type LegalSection } from "@/pages/legal/LegalPage";

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance and eligibility",
    content: <><p>These terms govern access to Blazemap and its public, account, reporting, mapping, monitoring, and information features.</p><p>By using Blazemap, you agree to use it lawfully and consistently with these terms. Government workspaces are restricted to authorized accounts provisioned for operational duties.</p></>,
  },
  {
    id: "service-purpose",
    title: "Service purpose",
    content: <><p>Blazemap is a decision-support and public-information service for forest and land fire indications in Kalimantan. It combines community observations, satellite thermal anomalies, weather forecasts, spatial context, and field information.</p><p>Blazemap is designed to help authorized people decide what should be checked, whether an indication has been verified, and what may require attention after confirmation.</p></>,
  },
  {
    id: "not-emergency-service",
    title: "Not an emergency service",
    content: <><p>Blazemap is not a replacement for local emergency services, official warning systems, or instructions from competent authorities.</p><ul><li>A submitted observation does not guarantee that a team has been dispatched.</li><li>The service does not guarantee a response time.</li><li>A road, river, facility, or water source shown on a map is not guaranteed to be available or safe.</li><li>In immediate danger, move to safety and contact the appropriate local authority or emergency service.</li></ul></>,
  },
  {
    id: "information-limitations",
    title: "Information limitations",
    content: <><p>A NASA FIRMS hotspot is a detected thermal anomaly, not a confirmed fire. A community report is an observation, not a confirmed fire. Multiple reports may support investigation but do not confirm an incident by count alone.</p><p>An absence of satellite detections does not prove an absence of fire. BMKG information is a regional forecast, not a live sensor reading at the incident point. Peatland, road, river, facility, and settlement layers describe available context and may be incomplete or outdated.</p><p>Source time, freshness, and availability matter. Blazemap may distinguish unavailable, stale, not configured, not yet synchronized, and successful no-result states.</p></>,
  },
  {
    id: "ai-and-human-authority",
    title: "AI and human authority",
    content: <><p>AI may organize evidence, summarize limitations, suggest investigation priority, and identify potential impact context. AI cannot:</p><ul><li>confirm or reject a fire indication;</li><li>issue an official warning;</li><li>dispatch personnel or equipment;</li><li>select a guaranteed safe route;</li><li>order or authorize evacuation.</li></ul><p>Verification, publication, warnings, response, and evacuation decisions remain the responsibility of appropriately authorized people.</p></>,
  },
  {
    id: "reporting-responsibilities",
    title: "Reporting responsibilities",
    content: <><p>When submitting an observation, you agree to provide information in good faith and to the best of your knowledge. Do not:</p><ul><li>submit fabricated, misleading, unlawful, or harassing content;</li><li>impersonate another person or authority;</li><li>upload material you are not permitted to provide;</li><li>approach smoke, flames, or unsafe terrain to gather evidence;</li><li>use Blazemap to interfere with emergency or government operations.</li></ul><p>Describe uncertainty honestly. If you provide your own position rather than an estimated incident location, label it correctly.</p></>,
  },
  {
    id: "accounts-and-access",
    title: "Accounts and access",
    content: <><p>You are responsible for maintaining the confidentiality of your account and for activity performed through your authenticated session. Do not share government access with unauthorized people.</p><p>Blazemap may restrict, deactivate, or revoke access when required for security, misuse prevention, role changes, or operational governance. Authority changes may invalidate existing sessions.</p></>,
  },
  {
    id: "content-and-evidence",
    title: "Content and evidence",
    content: <><p>You retain any rights you have in content you submit. You grant the service permission to store, process, reproduce, transform, and present that content as needed to operate the reporting, verification, security, and privacy-review workflows.</p><p>Private evidence is not automatically public. Authorized publication requires a separate review. Blazemap may reject, revoke, or remove media that is unsafe, unlawful, misleading, unrelated, technically invalid, or no longer approved for publication.</p></>,
  },
  {
    id: "public-information-use",
    title: "Use of public information",
    content: <><p>Public updates should be read together with their source information, publication time, validity, correction, supersession, or withdrawal state.</p><p>Do not remove uncertainty labels, represent Blazemap output as an independent official order, or claim that a map marker establishes a confirmed perimeter unless the content explicitly states that an authorized confirmation and approved perimeter exist.</p><p>Third-party source names, datasets, maps, and services remain subject to their own terms and attribution requirements.</p></>,
  },
  {
    id: "availability-and-changes",
    title: "Availability and changes",
    content: <><p>Features and integrations may be delayed, unavailable, limited, corrected, or withdrawn. External sources can fail or become stale. Blazemap may change, suspend, or discontinue features when needed for safety, maintenance, security, compliance, or product development.</p><p>No uninterrupted, error-free, or complete availability is promised.</p></>,
  },
  {
    id: "disclaimers",
    title: "Disclaimers and responsibility",
    content: <><p>Blazemap provides contextual information and workflow support. To the extent permitted by applicable law, the service is provided without guarantees that every indication will be detected, reviewed, verified, published, or acted upon within a particular time.</p><p>Nothing in Blazemap should be treated as a substitute for field assessment, professional judgment, official instructions, or legal duties.</p></>,
  },
  {
    id: "contact-and-changes",
    title: "Contact and changes",
    content: <><p>Questions about these terms should be sent through the verified channel published on the <a href="/contact">Contact page</a>.</p><p>These terms may be revised as the product and applicable requirements change. The date at the top identifies the current version.</p></>,
  },
];

export default function TermsPage() {
  return <LegalPage eyebrow="Legal" title="Terms of Use" summary="The responsibilities, limitations, and authority boundaries that apply when using Blazemap." updated="19 September 2026" notice="These terms reflect the current product concept and implementation boundaries. Governing law, operator identity, dispute terms, and other jurisdiction-specific provisions require owner and legal approval before production launch." sections={sections} />;
}
