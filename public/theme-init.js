// Apply the saved theme before the first paint to avoid a flash.
try {
  var theme = JSON.parse(localStorage.getItem('cd.theme') || '"dark"')
  document.documentElement.classList.toggle('dark', theme !== 'light')
  document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark'
} catch {
  // storage blocked: keep the default dark theme
}
