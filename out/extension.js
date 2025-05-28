"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const http = __importStar(require("http"));
const axios_1 = __importDefault(require("axios"));
const PORT = 3001;
const REDIRECT_URI = 'http://localhost:3001/figma/callback';
const SCOPE = 'file_read';
let accessToken = '';
let useID = '';
let clientID = '';
let clientSecret = '';
function activate(context) {
    console.log('Congratulations, your extension "testfigmaembed" is now active!');
    context.subscriptions.push(vscode.commands.registerCommand('testfigmaembed.ouath', async () => {
        const panel = vscode.window.createWebviewPanel('figmaEmbed', 'Test Figma embed', vscode.ViewColumn.One, {
            enableScripts: true
        });
        panel.webview.html = getWebviewContent();
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'oauth':
                    if (!message.clientID || !message.clientSecret) {
                        vscode.window.showErrorMessage(`Please enter clientID and clientSecret!`);
                        return;
                    }
                    else {
                        clientID = message.clientID;
                        clientSecret = message.clientSecret;
                    }
                    try {
                        const code = await getOAuthCode();
                        if (!code) {
                            vscode.window.showErrorMessage('cannot achieve code!');
                            return;
                        }
                        const tokenRes = await axios_1.default.post('https://api.figma.com/v1/oauth/token', new URLSearchParams({
                            client_id: clientID,
                            client_secret: clientSecret,
                            redirect_uri: REDIRECT_URI,
                            code: code,
                            grant_type: 'authorization_code',
                        }), {
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                        });
                        accessToken = tokenRes.data.access_token;
                        useID = tokenRes.data.user_id_string;
                        // Send token info to webview
                        panel.webview.postMessage({
                            type: 'token-info',
                            accessToken: accessToken,
                            userId: useID
                        });
                        vscode.window.showInformationMessage('Got Figma OAuth info!');
                    }
                    catch (err) {
                        console.log('');
                    }
            }
        }, undefined, context.subscriptions);
    }));
}
// This method is called when your extension is deactivated
function deactivate() { }
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
    /* 响应式 */
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
    /* 错误提示 */
    .error-message {
      margin-top: 12px;
      color: #d93025;
      font-weight: 600;
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

  
    function clearError() {
      errorMessage.style.display = 'none';
      errorMessage.textContent = '';
    }

   
    function showError(msg) {
      errorMessage.textContent = msg;
      errorMessage.style.display = 'block';
    }

    
    function updateFigmaFrame() {
      figmaFrame.src = 'https://embed.figma.com/design/bGRYHtpnPIua9w2ifQN9dz/%E6%96%B0%E7%89%88%E9%A1%B5%E9%9D%A2?node-id=90-1312&embed-host=share';
    }

    oauthForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearError();

      const clientID = oauthForm.clientID.value.trim();
      const clientSecret = oauthForm.clientSecret.value.trim();

      if (!clientID || !clientSecret) {
        showError('请填写 Client ID 和 Client Secret');
        return;
      }


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

        updateFigmaFrame();
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
async function getOAuthCode() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            console.log(String(req.url));
            if (typeof req.url !== 'string') {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid request');
                server.close();
                resolve(undefined);
                return;
            }
            let url;
            try {
                url = new URL(req.url, `http://localhost:${PORT}`);
            }
            catch (e) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid URL');
                server.close();
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
						debugger
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
            }
            else if (url.pathname === '/figma/callback') {
                const code = url.searchParams.get('code');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<h2>OAuth2 success! Please back to VSCode.</h2>');
                resolve(code || undefined);
                return;
            }
            else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not found');
                resolve(undefined);
            }
        });
        server.listen(PORT, async () => {
            const state = Math.random().toString(36).slice(2);
            const authUrl = `https://www.figma.com/oauth?client_id=${clientID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPE}&state=${state}&response_type=code`;
            vscode.env.openExternal(vscode.Uri.parse(authUrl));
        });
    });
}
//# sourceMappingURL=extension.js.map