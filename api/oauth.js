export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    // Step 1: redirect to GitHub OAuth authorization
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : process.env.URL}/api/oauth`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo',
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
    return;
  }

  // Step 2: exchange authorization code for access token
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await tokenRes.json();

    if (data.access_token) {
      // Return token to Decap CMS via postMessage
      res.setHeader('Content-Type', 'text/html');
      res.send(`<script>
(function() {
  function receiveMessage(e){
    window.opener.postMessage(
      '${JSON.stringify(data).replace(/'/g, "\\'")}',
      '*'
    );
    window.close();
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:'+window.location.origin, '*');
})();
</script>`);
    } else {
      res.status(400).json({ error: 'GitHub OAuth failed', details: data });
    }
  } catch (err) {
    res.status(500).json({ error: 'OAuth server error', message: err.message });
  }
}
