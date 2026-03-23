const GITHUB_CLIENT_ID = 'Ov23liOmp3QETGGh7il9';
const GITHUB_CLIENT_SECRET = '8539612ebbc323e70f74ea216c9d978f58d8cf26';
const REDIRECT_URI = 'https://qqjc-auth.jctj.workers.dev/callback';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/auth') {
    const githubAuthUrl = 'https://github.com/login/oauth/authorize' +
      '?client_id=' + GITHUB_CLIENT_ID +
      '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
      '&scope=repo user';
    return new Response(
      '<html><body><script>window.location.href="' + githubAuthUrl + '";</script></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (path === '/callback') {
    const code = url.searchParams.get('code');
    if (!code) {
      return new Response('Missing code', { status: 400 });
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI
      })
    });

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token || '';

    const html = `<!DOCTYPE html>
<html><body>
<script>
  (function() {
    var token = "${token}";
    function receiveMessage(e) {
      var data = JSON.stringify({ token: token, provider: "github" });
      window.opener.postMessage("authorization:github:success:" + data, e.origin);
      window.removeEventListener("message", receiveMessage);
    }
    window.addEventListener("message", receiveMessage);
    window.opener.postMessage("authorizing:github", "*");
  })();
</script>
</body></html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  return new Response('Not Found', { status: 404 });
}
