/**
 * Turns on Next's immutable static assets.
 *
 * The flag is deliberately not an app-level switch: `supportsImmutableAssets`
 * in `next.config` only exists so an app can opt *out* of what its adapter
 * offers, and setting it true there does nothing. An adapter has to declare
 * support, because the guarantee belongs to whatever serves the files — assets
 * under `/_next/static/immutable/*` are requested without the `?dpl` skew
 * parameter, so they live in one namespace shared by every deployment and must
 * stay reachable, unchanged, for as long as any deployment references them.
 *
 * Serving `.next/static` from this repo satisfies that: the filenames are
 * content hashes, so a rebuild that changes a file changes its name.
 *
 * There is no `onBuildComplete` because there is nothing to upload — a real
 * platform adapter would use `outputs.staticFiles[].immutableHash` there to
 * decide which files to publish without the `?dpl` parameter.
 *
 * @type {import('next').NextAdapter}
 */
const adapter = {
  name: 'mai-habi-immutable-assets',

  modifyConfig(config, { phase }) {
    // Only the production build emits static assets; other phases load the
    // config too, and flipping this outside a build would be meaningless.
    if (phase === 'phase-production-build') {
      // `??` so an explicit `supportsImmutableAssets: false` still wins.
      config.supportsImmutableAssets = config.supportsImmutableAssets ?? true;
    }

    return config;
  },
};

export default adapter;
