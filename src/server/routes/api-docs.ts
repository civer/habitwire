export default defineEventHandler((event) => {
  const config = {
    theme: 'kepler',
    darkMode: true
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>HabitWire API</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    /* Hide Generate SDKs button */
    button:has(span:contains("Generate")),
    a[href*="sdk"],
    [class*="header"] button:nth-child(2) {
      display: none !important;
    }
  </style>
</head>
<body>
  <script
    id="api-reference"
    data-url="/openapi.json"
    data-configuration='${JSON.stringify(config)}'
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  <script>
    // Hide Generate SDKs and Share buttons after load
    setTimeout(() => {
      document.querySelectorAll('button').forEach(btn => {
        if (btn.textContent.includes('Generate SDK') || btn.textContent.includes('Share')) {
          btn.style.display = 'none';
        }
      });
    }, 1000);
  </script>
</body>
</html>`

  setHeader(event, 'Content-Type', 'text/html')
  return html
})
