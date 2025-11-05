export default defineNuxtPlugin(async () => {
  const { initMsal } = useMsal();
  await initMsal();
});
