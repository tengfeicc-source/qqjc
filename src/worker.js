const GITHUB_CLIENT_ID = 'Ov23liOmp3QETGGh7il9';
const GITHUB_CLIENT_SECRET = '8539612ebbc323e70f74ea216c9d978f58d8cf26';
const REDIRECT_URI = 'https://qqjc-auth.jctj.workers.dev/callback';

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (path === '/auth') {
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
    githubAuthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    githubAuthUrl.searchParams.set('scope', 'repo user');

    const html = `<!DOCTYPE html><html><body><script>window.location.href='${githubAuthUrl.toString()}';</script></body></html>`;
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (path === '/callback') {
    const code = url.searchParams.get('code');
    if (!code) return new Response('Missing code', { status: 400 });

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokenData = await tokenResponse.json();

    const html = `<!DOCTYPE html><html><body><script>
      (function() {
        function receiveMessage(e) {
          var data = ${JSON.stringify(JSON.stringify({ token: 'PLACEHOLDER', provider: 'github' }))};
          var parsed = JSON.parse(data);
          parsed.token = '${'${tokenData.access_token}'}' || '';
          window.opener.postMessage('authorization:github:success:' + JSON.stringify(parsed), e.origin);
          window.removeEventListener('message', receiveMessage, false);
        }
        window.addEventListener('message', receiveMessage, false);
        window.opener.postMessage('authorizing:github', '*');
      })();
    </script></body></html>`;
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return new Response('Not Found', { status: 404 });
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
