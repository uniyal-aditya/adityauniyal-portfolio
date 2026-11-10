import type { ReactElement } from 'react'
// Tabler — brand marks + a few technical glyphs
import {
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandX,
  IconBrandReact,
  IconBrandPython,
  IconBrandTypescript,
  IconBrandJavascript,
  IconBrandDiscord,
  IconCoffee,
  IconSettingsAutomation,
} from '@tabler/icons-react'
// Phosphor — expressive / playful glyphs
import { RocketLaunch, GameController, Check, Star } from '@phosphor-icons/react'
// Heroicons — clean UI glyphs
import {
  EnvelopeIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
// Lucide — arrows & general purpose
import { ArrowRight, ArrowUpRight, ArrowDown, Bot, Database, Copy, ExternalLink } from 'lucide-react'

/**
 * One place that decides WHICH icon library draws WHICH glyph.
 * Use  <AppIcon name="github" />  anywhere — to swap a glyph for another
 * library's version, change only its entry below.
 *
 *   Tabler     brands (GitHub, LinkedIn, X, React…) + coffee / automation
 *   Phosphor   rocket, game controller, check, star
 *   Heroicons  mail, résumé download, success circle, close
 *   Lucide     arrows, bot, database, copy, external link
 */
type RenderProps = { size: number | string; className?: string }

const REGISTRY = {
  // ── brands (Tabler) ──────────────────────────────────────────
  github: (p: RenderProps) => <IconBrandGithub size={p.size} stroke={1.6} className={p.className} aria-hidden="true" />,
  linkedin: (p: RenderProps) => <IconBrandLinkedin size={p.size} stroke={1.6} className={p.className} aria-hidden="true" />,
  x: (p: RenderProps) => <IconBrandX size={p.size} stroke={1.6} className={p.className} aria-hidden="true" />,
  discord: (p: RenderProps) => <IconBrandDiscord size={p.size} stroke={1.6} className={p.className} aria-hidden="true" />,
  react: (p: RenderProps) => <IconBrandReact size={p.size} stroke={1.5} className={p.className} aria-hidden="true" />,
  python: (p: RenderProps) => <IconBrandPython size={p.size} stroke={1.5} className={p.className} aria-hidden="true" />,
  typescript: (p: RenderProps) => <IconBrandTypescript size={p.size} stroke={1.5} className={p.className} aria-hidden="true" />,
  javascript: (p: RenderProps) => <IconBrandJavascript size={p.size} stroke={1.5} className={p.className} aria-hidden="true" />,
  // ── hobbies ──────────────────────────────────────────────────
  gaming: (p: RenderProps) => <GameController size={p.size} weight="duotone" className={p.className} aria-hidden="true" />,
  ai: (p: RenderProps) => <Bot size={p.size} strokeWidth={1.6} className={p.className} aria-hidden="true" />,
  automation: (p: RenderProps) => <IconSettingsAutomation size={p.size} stroke={1.6} className={p.className} aria-hidden="true" />,
  backend: (p: RenderProps) => <Database size={p.size} strokeWidth={1.6} className={p.className} aria-hidden="true" />,
  coffee: (p: RenderProps) => <IconCoffee size={p.size} stroke={1.6} className={p.className} aria-hidden="true" />,
  // ── contact / actions ────────────────────────────────────────
  project: (p: RenderProps) => <RocketLaunch size={p.size} weight="duotone" className={p.className} aria-hidden="true" />,
  mail: (p: RenderProps) => <EnvelopeIcon width={p.size} height={p.size} strokeWidth={1.6} className={p.className} aria-hidden="true" />,
  resume: (p: RenderProps) => <DocumentArrowDownIcon width={p.size} height={p.size} strokeWidth={1.6} className={p.className} aria-hidden="true" />,
  copy: (p: RenderProps) => <Copy size={p.size} strokeWidth={1.7} className={p.className} aria-hidden="true" />,
  external: (p: RenderProps) => <ExternalLink size={p.size} strokeWidth={1.7} className={p.className} aria-hidden="true" />,
  // ── status / UI ──────────────────────────────────────────────
  check: (p: RenderProps) => <Check size={p.size} weight="bold" className={p.className} aria-hidden="true" />,
  success: (p: RenderProps) => <CheckCircleIcon width={p.size} height={p.size} strokeWidth={1.5} className={p.className} aria-hidden="true" />,
  close: (p: RenderProps) => <XMarkIcon width={p.size} height={p.size} strokeWidth={1.8} className={p.className} aria-hidden="true" />,
  star: (p: RenderProps) => <Star size={p.size} weight="fill" className={p.className} aria-hidden="true" />,
  arrowRight: (p: RenderProps) => <ArrowRight size={p.size} strokeWidth={1.8} className={p.className} aria-hidden="true" />,
  arrowUpRight: (p: RenderProps) => <ArrowUpRight size={p.size} strokeWidth={1.8} className={p.className} aria-hidden="true" />,
  arrowDown: (p: RenderProps) => <ArrowDown size={p.size} strokeWidth={1.8} className={p.className} aria-hidden="true" />,
} satisfies Record<string, (p: RenderProps) => ReactElement>

export type IconName = keyof typeof REGISTRY

export interface AppIconProps {
  name: IconName
  /** px number or any CSS length — "1em" follows the surrounding font-size. */
  size?: number | string
  className?: string
}

export function AppIcon({ name, size = 18, className }: AppIconProps) {
  return REGISTRY[name]({ size, className })
}
