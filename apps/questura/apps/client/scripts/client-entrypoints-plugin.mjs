/** Keep the first-load JS gate tied to actual Webpack entrypoints.
 * Next 16 removed app-build-manifest.json; client-reference manifests also
 * contain sibling entrypoints and cannot measure this budget accurately.
 */
export function clientEntryManifest(entrypoints) {
  const pages = Object.fromEntries(
    [...entrypoints]
      .filter(([name]) => name.startsWith('app/'))
      .map(([name, entry]) => [`/${name.slice(4)}`, entry.getFiles()]),
  )
  // Next's runtime is its own entrypoint in 16, rather than a dependency of
  // every page entrypoint. It is still downloaded on every first load.
  const runtime = entrypoints.get('main-app')
  if (!runtime) throw new Error('Next client bootstrap entrypoint is missing')
  pages['/layout'] = [...new Set([...(pages['/layout'] ?? []), ...runtime.getFiles()])]
  return { pages }
}

export class ClientEntrypointsPlugin {
  apply(compiler) {
    const name = 'QuesturaClientEntrypoints'
    compiler.hooks.thisCompilation.tap(name, (compilation) => {
      compilation.hooks.processAssets.tap(
        { name, stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT },
        () => compilation.emitAsset(
          'questura-client-entrypoints.json',
          new compiler.webpack.sources.RawSource(JSON.stringify(clientEntryManifest(compilation.entrypoints))),
        ),
      )
    })
  }
}
