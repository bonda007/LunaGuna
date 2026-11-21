(function boot() {
  try {
    var raw = localStorage.getItem('lunaguna.v1');
    if (!raw) return;
    var data = JSON.parse(raw);
    if (!data || data.lang !== 'en') return;
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  } catch (error) {
    /* Keep the Hebrew default if storage is unreadable. */
  }
})();
