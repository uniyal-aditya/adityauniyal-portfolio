import { AppIcon, type IconName } from '@/components/icons/AppIcon'

const FACES: IconName[] = ['react', 'python', 'typescript', 'javascript', 'discord', 'github']

/**
 * Pure-CSS 3D hero piece: a slowly turning cube whose faces carry the stack,
 * with two orbit rings. No canvas / WebGL / extra library. Desktop only (the
 * CSS hides it on small screens so mobile speed is untouched) and static for
 * prefers-reduced-motion.
 */
export function HeroScene() {
  return (
    <div className="hero-scene" aria-hidden="true">
      <div className="hs-glow" />
      <div className="hs-stage">
        <span className="hs-ring r1" />
        <span className="hs-ring r2" />
        <div className="hs-cube">
          {FACES.map((name, i) => (
            <div key={name} className={'hs-face f' + (i + 1)}>
              <AppIcon name={name} size={46} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
