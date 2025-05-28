// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as http from 'http';
import axios from 'axios';

const PORT = 3001;
const REDIRECT_URI = 'http://localhost:3001/figma/callback';
const SCOPE = 'file_read';
let accessToken = '';
let useID = '';
let clientID = '';
let clientSecret = '';

class OAuthServer {
  private server: http.Server | null = null;

  close() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  async getOAuthCode(): Promise<string | undefined> {
    // Close any existing server
    this.close();

    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        console.log(String(req.url));
        if (typeof req.url !== 'string') {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid request');
          this.close();
          resolve(undefined);
          return;
        }
        let url: URL;
        try {
          url = new URL(req.url, `http://localhost:${PORT}`);
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid URL');
          this.close();
          resolve(undefined);
          return;
        }
        if (url.pathname === '/figma/callback/index.html') {
          res.writeHead(200, { 
            'Content-Type': 'text/html',
            'Authorization': `Bearer ${accessToken}`,
            'X-User-Id': `${useID}`,
          });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Figma Embed</title>
                <style>
                    body, html {
                        margin: 0;
                        padding: 0;
                        height: 100%;
                        overflow: hidden;
                    }
                    iframe {
                        width: 100%;
                        height: 100%;
                        border: none;
                    }
                    .figma-container {
                      margin-top: 20px;
                      width: 100%;
                      display: flex;
                      justify-content: center;
                    }
                  </style>
                </head>
                <body>
                    <iframe id="figma-frame" src="https://embed.figma.com/design/bGRYHtpnPIua9w2ifQN9dz/%E6%96%B0%E7%89%88%E9%A1%B5%E9%9D%A2?node-id=90-1312&embed-host=share"></iframe>
                    <script>
                        window.addEventListener('message', (event) => {
                            if (event.data.type === 'figma-auth-required') {
                                fetch('/figma-proxy', {
                                    headers: {
                                        'Authorization': 'Bearer ${accessToken}'
                                    }
                                });
                            }
                        });
                    </script>
                </body>
                </html>
          `);
        } else if (url.pathname === '/figma/callback') {
          const code = url.searchParams.get('code');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h2>OAuth2 success! Please back to VSCode.</h2>');
          resolve(code || undefined);
          return;
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          resolve(undefined);
        }
      });

      this.server.listen(PORT, async () => {
        const state = Math.random().toString(36).slice(2);
        const authUrl: string = `https://www.figma.com/oauth?client_id=${clientID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPE}&state=${state}&response_type=code`;
        vscode.env.openExternal(vscode.Uri.parse(authUrl)); 
      }); 
    });
  }
}

const oauthServer = new OAuthServer();

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "testfigmaembed" is now active!');
	context.subscriptions.push(
		vscode.commands.registerCommand('testfigmaembed.ouath', async () => {
			const panel = vscode.window.createWebviewPanel(
				'figmaEmbed',
				'Test Figma embed',
				vscode.ViewColumn.One,
				{
					enableScripts: true
				}
				);

				panel.webview.html = getWebviewContent();
				panel.webview.onDidReceiveMessage(
				async message => {
					switch (message.command) {
					case 'oauth':
            if (!message.clientID || !message.clientSecret) {
              vscode.window.showErrorMessage(`Please enter clientID and clientSecret!`);
              return;
            } else {
              clientID = message.clientID;
						  clientSecret = message.clientSecret;
            }
            oauthServer.close();
						try {
							const code = await oauthServer.getOAuthCode();
							if (!code) {
								vscode.window.showErrorMessage('cannot achieve code!');
								return;
							}
							const tokenRes = await axios.post(
								'https://api.figma.com/v1/oauth/token',
								new URLSearchParams({
									client_id: clientID,
									client_secret: clientSecret,
									redirect_uri: REDIRECT_URI,
									code: code,
									grant_type: 'authorization_code',
									}),
									{
									headers: {
										'Content-Type': 'application/x-www-form-urlencoded',
									},
								}
							);
							accessToken = tokenRes.data.access_token;
							useID = tokenRes.data.user_id_string;
							// Send token info to webview
							panel.webview.postMessage({
								type: 'token-info',
								accessToken: accessToken,
								userId: useID
							});
							vscode.window.showInformationMessage('Got Figma OAuth info!');
						} catch (err) {
							console.log('');
						}
					}
				},
				undefined,
				context.subscriptions
				);
			}
		)
	);
}

// This method is called when your extension is deactivated
export function deactivate() {
  oauthServer.close();
}

function getWebviewContent() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Test Embed Figma</title>
  <style>
    body {
      padding: 20px;
      font-family: Arial, sans-serif;
      background-color: #fafafa;
      color: #333;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgb(0 0 0 / 0.1);
    }
    h2 {
      margin-bottom: 16px;
      font-weight: 600;
      font-size: 1.5rem;
    }
    form {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    input[type="text"] {
      flex: 1 1 200px;
      padding: 10px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
      outline-offset: 2px;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus {
      border-color: #007acc;
      box-shadow: 0 0 3px #007acc;
    }
    button {
      padding: 10px 20px;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.2s;
      flex-shrink: 0;
    }
    button:disabled {
      background: #a0c4e8;
      cursor: not-allowed;
    }
    button:hover:not(:disabled) {
      background: #005999;
    }
    .info-section {
      margin-top: 24px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
      display: none;
    }
    .info-item {
      margin-bottom: 12px;
    }
    .label {
      font-weight: 600;
      margin-bottom: 6px;
      display: block;
    }
    .value {
      word-break: break-word;
      padding: 10px;
      background: white;
      border-radius: 4px;
      border: 1px solid #ddd;
      font-family: monospace;
      font-size: 0.9rem;
      user-select: text;
    }
    .figma-container {
      margin-top: 32px;
      text-align: center;
    }
    iframe#figmaFrame {
      border: 1px solid rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 800px;
      height: 450px;
      border-radius: 6px;
    }

    @media (max-width: 600px) {
      form {
        flex-direction: column;
        align-items: stretch;
      }
      button {
        width: 100%;
      }
      iframe#figmaFrame {
        height: 300px;
      }
    }

    .error-message {
      margin-top: 12px;
      color: #d93025;
      font-weight: 600;
    }
   
    .sr-only {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }
    input#embedUrl {
  flex-basis: 100%;
}
  </style>
</head>
<body>
  <div class="container" role="main" aria-label="Test Figma oauth and embed">
    <h2>Test Figma embed</h2>
    <form id="oauthForm" novalidate>
      <label for="clientID" class="sr-only">Client ID</label>
      <input
        type="text"
        id="clientID"
        name="clientID"
        placeholder="Client ID"
        autocomplete="off"
        required
        aria-required="true"
      />
      <label for="clientSecret" class="sr-only">Client Secret</label>
      <input
        type="text"
        id="clientSecret"
        name="clientSecret"
        placeholder="Client Secret"
        autocomplete="off"
        required
        aria-required="true"
      />
      <label for="embedUrl" class="sr-only">Figma Embed URL</label>
      <input
        type="text"
        id="embedUrl"
        name="embedUrl"
        placeholder="Figma Embed URL (optional)"
        autocomplete="off"
        aria-describedby="embedUrlHelp"
      />
      <button type="submit" id="oauthBtn">start OAuth2</button>
    </form>
    <div id="errorMessage" class="error-message" role="alert" aria-live="assertive" style="display:none;"></div>

    <section id="tokenInfo" class="info-section" aria-live="polite" aria-atomic="true">
      <div class="info-item">
        <span class="label">Access Token:</span>
        <div id="accessTokenValue" class="value" tabindex="0" aria-label="Access Token"></div>
      </div>
      <div class="info-item">
        <span class="label">User ID:</span>
        <div id="userIdValue" class="value" tabindex="0" aria-label="User ID"></div>
      </div>
    </section>

    <div class="figma-container" aria-label="Figma preview">
      <iframe
        id="figmaFrame"
        title="Figma preview"
        allowfullscreen
        sandbox="allow-scripts allow-same-origin allow-popups"
      ></iframe>
    </div>
  </div>

  <script>
    // VSCode API
    const vscode = acquireVsCodeApi();

    // DOM Elements
    const oauthForm = document.getElementById('oauthForm');
    const oauthBtn = document.getElementById('oauthBtn');
    const tokenInfo = document.getElementById('tokenInfo');
    const accessTokenValue = document.getElementById('accessTokenValue');
    const userIdValue = document.getElementById('userIdValue');
    const errorMessage = document.getElementById('errorMessage');
    const figmaFrame = document.getElementById('figmaFrame');
    const embedUrlInput = document.getElementById('embedUrl');

    
    const DEFAULT_FIGMA_EMBED_URL = 'https://embed.figma.com/design/bGRYHtpnPIua9w2ifQN9dz/%E6%96%B0%E7%89%88%E9%A1%B5%E9%9D%A2?node-id=90-1312&embed-host=share';

    function clearError() {
      errorMessage.style.display = 'none';
      errorMessage.textContent = '';
    }

    function showError(msg) {
      errorMessage.textContent = msg;
      errorMessage.style.display = 'block';
    }

    function isValidUrl(url) {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }
    function updateFigmaFrame() {
      const url = embedUrlInput.value.trim();
      if (url) {
        if (!isValidUrl(url)) {
          showError('Please enter valid URL!');
          return false;
        }
        figmaFrame.src = url;
      } else {
        figmaFrame.src = DEFAULT_FIGMA_EMBED_URL;
      }
      return true;
    }

    oauthForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearError();

      const clientID = oauthForm.clientID.value.trim();
      const clientSecret = oauthForm.clientSecret.value.trim();

      if (!clientID || !clientSecret) {
        showError('Please enter Client ID and Client Secret');
        return;
      }

      // 先尝试更新 iframe，如果 URL 无效则阻止提交
      if (!updateFigmaFrame()) {
        return;
      }

      // 禁用按钮防止重复提交
      oauthBtn.disabled = true;

      vscode.postMessage({
        command: 'oauth',
        clientID,
        clientSecret
      });
    });

    window.addEventListener('message', event => {
      const message = event.data;

      if (message.type === 'token-info') {
        oauthBtn.disabled = false;
        clearError();

        tokenInfo.style.display = 'block';
        accessTokenValue.textContent = message.accessToken || '';
        userIdValue.textContent = message.userId || '';
      } else if (message.type === 'error') {
        oauthBtn.disabled = false;
        showError(message.error || 'unknown error!');
      }
    });
  </script>
</body>
</html>
  `;
}
