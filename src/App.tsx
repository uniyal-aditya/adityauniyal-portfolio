import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Chrome } from '@/components/layout/Chrome'
import { JournalShell } from '@/components/layout/JournalShell'

// Portfolio pages (core shell - eager for instant first paint)
import Home from '@/pages/portfolio/Home'
import Work from '@/pages/portfolio/Work'

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

export default function App() {
  const loc = useLocation()

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes location={loc}>
        <Route element={<Chrome />}>
          <Route path="/" element={<Home />} />
          <Route path="/work" element={<Work />} />
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
