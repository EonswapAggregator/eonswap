import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

const Layout = lazy(() =>
  import('./components/Layout').then((m) => ({ default: m.Layout })),
)
const HomePage = lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage })),
)
const SwapPage = lazy(() =>
  import('./pages/SwapPage').then((m) => ({ default: m.SwapPage })),
)
const BridgePage = lazy(() =>
  import('./pages/BridgePage').then((m) => ({ default: m.BridgePage })),
)
const EarnPage = lazy(() =>
  import('./pages/EarnPage').then((m) => ({ default: m.EarnPage })),
)
const ActivityPage = lazy(() =>
  import('./pages/ActivityPage').then((m) => ({ default: m.ActivityPage })),
)
const DocsPage = lazy(() =>
  import('./pages/DocsPage').then((m) => ({ default: m.DocsPage })),
)
const FaqPage = lazy(() =>
  import('./pages/FaqPage').then((m) => ({ default: m.FaqPage })),
)
const StatusPage = lazy(() =>
  import('./pages/StatusPage').then((m) => ({ default: m.StatusPage })),
)
const ContactSupportPage = lazy(() =>
  import('./pages/ContactSupportPage').then((m) => ({
    default: m.ContactSupportPage,
  })),
)
const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })),
)
const CareersPage = lazy(() =>
  import('./pages/CareersPage').then((m) => ({ default: m.CareersPage })),
)
const PressKitPage = lazy(() =>
  import('./pages/PressKitPage').then((m) => ({ default: m.PressKitPage })),
)
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })),
)
const TermsPage = lazy(() =>
  import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })),
)
const PrivacyPage = lazy(() =>
  import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
)
const RiskDisclosurePage = lazy(() =>
  import('./pages/RiskDisclosurePage').then((m) => ({
    default: m.RiskDisclosurePage,
  })),
)
const DisclaimerPage = lazy(() =>
  import('./pages/DisclaimerPage').then((m) => ({ default: m.DisclaimerPage })),
)
const AmlPolicyPage = lazy(() =>
  import('./pages/AmlPolicyPage').then((m) => ({ default: m.AmlPolicyPage })),
)

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-eon-bg" />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/swap" element={<SwapPage />} />
            <Route path="/bridge" element={<BridgePage />} />
            <Route path="/earn" element={<EarnPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/contact-support" element={<ContactSupportPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/press-kit" element={<PressKitPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/risk-disclosure" element={<RiskDisclosurePage />} />
            <Route path="/disclaimer" element={<DisclaimerPage />} />
            <Route path="/aml-policy" element={<AmlPolicyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
