import { LegalPageTemplate } from '../components/LegalPageTemplate'
import { roleEmail } from '../lib/site'

export function ContactPage() {
  const helloEmail = roleEmail('hello')
  const securityEmail = roleEmail('security')

  return (
    <LegalPageTemplate
      eyebrow="Company"
      title="Contact"
      intro="Reach out for partnerships, product collaboration, media requests, or general company inquiries."
      updatedAt="April 7, 2026"
      sections={[
        {
          title: 'General',
          paragraphs: [
            `For business and partnership inquiries: ${helloEmail}.`,
            'For support-specific issues, use the Contact Support page for faster routing.',
          ],
        },
        {
          title: 'Security',
          paragraphs: [
            `To report vulnerabilities, contact ${securityEmail} with steps to reproduce and impact details.`,
            'Please avoid disclosing security issues publicly before coordinated resolution.',
          ],
        },
        {
          title: 'Response Expectations',
          paragraphs: [
            'Critical security reports are prioritized. General requests are handled in queue order.',
            'Response times may vary depending on issue complexity and verification requirements.',
          ],
        },
      ]}
    />
  )
}
