import { postInstall, track } from './utils/analytics';

(async function() {
  await postInstall();
  await track('Installed');
})();
