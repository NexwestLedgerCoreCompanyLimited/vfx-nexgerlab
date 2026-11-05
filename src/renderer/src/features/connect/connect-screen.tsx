import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { McpConfig } from '../../../../shared/contracts/ipc';
import { CLIENT_NAME, MCP_TOOL_NAMES } from '../../../../shared/mcp-tools';
import { useEditor } from '../editor/use-editor-store';

export function ConnectScreen() {
  const { t } = useTranslation('generate');
  const go = useEditor((s) => s.go);
  const [config, setConfig] = useState<McpConfig>();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void window.vfxlab.getMcpConfig().then(setConfig);
  }, []);

  const snippet = config
    ? JSON.stringify(
        {
          mcpServers: {
            [CLIENT_NAME]: { command: config.command, args: config.args, env: config.env },
          },
        },
        null,
        2,
      )
    : '';

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
  }

  return (
    <div className="screen">
      <header className="bar">
        <button className="btn" type="button" onClick={() => go('home')}>
          ‹ {t('back')}
        </button>
        <h1 className="bar-title">{t('connectTitle')}</h1>
      </header>
      <div className="gen connect">
        <section className="stack">
          <p>{t('connectIntro')}</p>
          <pre className="panel json" aria-label={t('connectConfig')}>
            {snippet}
          </pre>
          <div className="row">
            <button className="btn pri" type="button" onClick={() => void copy()}>
              {copied ? t('copied') : t('copy')}
            </button>
          </div>
          <p className="muted small">{t('connectOutput', { path: config?.outputDir ?? '' })}</p>
          <p className="muted small">{t('connectPrivacy')}</p>
        </section>
        <section className="stack tight">
          <span className="sect">{t('connectTools')}</span>
          <ul className="plain">
            {MCP_TOOL_NAMES.map((name) => (
              <li key={name} className="tool">
                <code>{name}</code>
                <span className="muted small">{t(`tools.${name}`)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
