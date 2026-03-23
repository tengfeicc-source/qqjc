const GITHUB_CLIENT_ID = 'Ov23liOmp3QETGGh7il9';
const GITHUB_CLIENT_SECRET = '8539612ebbc323e70f74ea216c9d978f58d8cf26';
const REDIRECT_URI = 'https://qqjc-auth.jctj.workers.dev/callback';

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // /auth — 重定向到 GitHub 授权页面
  if (path === '/auth') {
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
    githubAuthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    githubAuthUrl.searchParams.set('scope', 'repo user');
    githubAuthUrl.searchParams.set('state', url.searchParams.get('state') || '');

    return Response.redirect(githubAuthUrl.toString(), 302);
  }

  // /callback — GitHub 授权后回调，用 code 换取 access_token
  if (path === '/callback') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state') || '';

    if (!code) {
      return new Response('Missing authorization code', { status: 400 });
    }

    // 向 GitHub 请求 access_token
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

    if (tokenData.error) {
      return new Response(`Error: ${tokenData.error_description}`, { status: 400 });
    }

    // 返回一个 HTML 页面，通过 postMessage 将 token 传给 CMS
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <script>
          (function() {
            function receiveMessage(e) {
              window.opener.postMessage(
                'authorization:github:success:${JSON.stringify({
                  token: tokenData.access_token,
                  provider: 'github',
                })}',
                e.origin
              );
              window.removeEventListener('message', receiveMessage, false);
            }
            window.addEventListener('message', receiveMessage, false);
            window.opener.postMessage('authorizing:github', '*');
          })();
        </script>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // 默认路径
  return new Response('Not Found', { status: 404 });
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
