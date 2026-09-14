import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Chrome } from '@/components/layout/Chrome'
import { JournalShell } from '@/components/layout/JournalShell'
import { useAuth } from '@/hooks/useAuth'

// Portfolio pages (core shell - eager for instant first paint)
import Home from '@/pages/portfolio/Home'
import Work from '@/pages/portfolio/Work'
const Building = lazy(() => import('@/pages/portfolio/Building'))

// Everything below is code-split
const Projects = lazy(() => import('@/pages/portfolio/Projects'))
const About = lazy(() => import('@/pages/portfolio/About'))
const Skills = lazy(() => import('@/pages/portfolio/Skills'))
const Connect = lazy(() => import('@/pages/portfolio/Connect'))
const Feedback = lazy(() => import('@/pages/portfolio/Feedback'))
const Privacy = lazy(() => import('@/pages/portfolio/Privacy'))
const NotFound = lazy(() => import('@/pages/portfolio/NotFound'))

const BlogHome = lazy(() => import('@/pages/blog/BlogHome'))
const PostPage = lazy(() => import('@/pages/blog/PostPage'))
const AuthorPage = lazy(() => import('@/pages/blog/AuthorPage'))
const TopicPage = lazy(() => import('@/pages/blog/TopicPage'))
const SeriesPage = lazy(() => import('@/pages/blog/SeriesPage'))
const SeriesIndex = lazy(() => import('@/pages/blog/SeriesIndex'))
const SearchPage = lazy(() => import('@/pages/blog/SearchPage'))

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const ApplyPage = lazy(() => import('@/pages/auth/ApplyPage'))

const Dashboard = lazy(() => import('@/pages/dash/Dashboard'))
const EditorPage = lazy(() => import('@/pages/dash/EditorPage'))

const AdminPage = lazy(() => import('@/pages/admin/AdminPage'))

function PageFallback() {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <span className="au-loader">AU_</span>
    </div>
  )
}

/**
 * Password-recovery catch: when a reset email points at the site root (or any
 * page other than the login form), the token exchange still creates a recovery
 * session — but the user is stranded with no way to set a new password. If a
 * session exists and the user has no usable password yet (recovery flag in the
 * URL fragment is consumed by supabase-js), send them to the new-password form.
 * Sessions from normal sign-ins are unaffected: we only redirect when landing
 * on a public page, never on dashboard/admin where users are already working.
 */
function RecoveryCatch() {
  const { session, isRecovery } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    // Only genuine recovery arrivals (PASSWORD_RECOVERY event) are caught.
    // Normal sign-ins on public pages are never touched — signed-in users
    // can browse /, /work etc. freely.
    if (!session || !isRecovery) return
    navigate('/blog/login?mode=reset', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isRecovery])
  return null
}

export default function App() {
  const loc = useLocation()

  return (
    <Suspense fallback={<PageFallback />}>
      <RecoveryCatch />
      <Routes location={loc}>
        <Route element={<Chrome />}>
          <Route path="/" element={<Home />} />
          <Route path="/work" element={<Work />} />
          <Route path="/building" element={<Building />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/about" element={<About />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/privacy" element={<Privacy />} />
        </Route>

        <Route element={<JournalShell />}>
          <Route path="/blog" element={<BlogHome />} />
          <Route path="/blog/search" element={<SearchPage />} />
          <Route path="/blog/post/:slug" element={<PostPage />} />
          <Route path="/blog/author/:username" element={<AuthorPage />} />
          <Route path="/blog/topic/:slug" element={<TopicPage />} />
          <Route path="/blog/series" element={<SeriesIndex />} />
          <Route path="/blog/series/:slug" element={<SeriesPage />} />
          <Route path="/blog/login" element={<LoginPage />} />
          <Route path="/blog/signup" element={<LoginPage />} />
          <Route path="/blog/apply" element={<ApplyPage />} />
          <Route path="/blog/dashboard" element={<Dashboard />} />
          <Route path="/blog/dashboard/editor" element={<EditorPage />} />
          <Route path="/blog/admin" element={<AdminPage />} />
          <Route path="/blog/admin/:section" element={<AdminPage />} />
        </Route>

        <Route element={<Chrome />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
