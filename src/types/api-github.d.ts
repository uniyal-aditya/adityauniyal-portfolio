/** The /api/github Vercel route is plain JS (serverless runtime) — declare it
 * so the dev-server importer typechecks. */
declare module '*/api/github.js' {
  const handler: (req: unknown, res: unknown) => Promise<void>
  export default handler
}
