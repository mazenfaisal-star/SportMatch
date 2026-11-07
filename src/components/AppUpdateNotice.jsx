import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { ArrowDownToLine, Clock3, X } from 'lucide-react';

const UPDATE_MANIFEST_URL = 'https://sportmatch-sable.vercel.app/app-version.json';
const UPDATE_ORIGIN = new URL(UPDATE_MANIFEST_URL).origin;
const DISMISSED_VERSION_KEY = 'sportmatch-dismissed-update-version';

function versionParts(value) {
  const match = String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/);
  return match ? match.slice(1, 4).map(Number) : null;
}

function isNewerVersion(latest, installed) {
  const latestParts = versionParts(latest);
  const installedParts = versionParts(installed);
  if (!latestParts || !installedParts) return false;
  for (let index = 0; index < latestParts.length; index += 1) {
    if (latestParts[index] !== installedParts[index]) return latestParts[index] > installedParts[index];
  }
  return false;
}

export default function AppUpdateNotice() {
  const [update, setUpdate] = useState(null);
  const [opening, setOpening] = useState(false);
  const activeRef = useRef(true);

  const checkForUpdate = useCallback(async () => {
    if (!activeRef.current || document.visibilityState === 'hidden') return;
    try {
      const [appInfo, response] = await Promise.all([
        CapacitorApp.getInfo(),
        fetch(`${UPDATE_MANIFEST_URL}?check=${Date.now()}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        }),
      ]);
      if (!response.ok) return;
      const manifest = await response.json();
      if (!activeRef.current) return;
      const latestVersion = String(manifest?.latestVersion || '').trim();
      const downloadUrl = new URL(String(manifest?.downloadUrl || ''), UPDATE_MANIFEST_URL);
      if (
        !isNewerVersion(latestVersion, appInfo.version) ||
        downloadUrl.protocol !== 'https:' ||
        downloadUrl.origin !== UPDATE_ORIGIN ||
        downloadUrl.pathname !== '/download/SportMatch.apk'
      ) return;
      if (sessionStorage.getItem(DISMISSED_VERSION_KEY) === latestVersion) return;
      setUpdate({
        version: latestVersion,
        notes: String(manifest?.releaseNotes || '').slice(0, 500),
        downloadUrl: downloadUrl.href,
      });
    } catch {
      // Update checks are best-effort and should not interrupt app startup.
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    activeRef.current = true;
    checkForUpdate();
    const listener = CapacitorApp.addListener('appStateChange', ({ isActive: appIsActive }) => {
      if (appIsActive) checkForUpdate();
    });
    return () => {
      activeRef.current = false;
      listener.then((handle) => handle.remove());
    };
  }, [checkForUpdate]);

  const dismiss = () => {
    if (update?.version) sessionStorage.setItem(DISMISSED_VERSION_KEY, update.version);
    setUpdate(null);
  };

  const downloadUpdate = async () => {
    if (!update?.downloadUrl || opening) return;
    setOpening(true);
    try {
      await Browser.open({ url: update.downloadUrl });
    } catch {
      window.open(update.downloadUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setOpening(false);
    }
  };

  if (!update) return null;

  return (
    <div className="app-update-backdrop" dir="rtl">
      <section className="app-update-card" role="dialog" aria-modal="true" aria-labelledby="app-update-title">
        <button className="app-update-close" onClick={dismiss} aria-label="لاحقًا"><X size={18} /></button>
        <div className="app-update-icon"><ArrowDownToLine size={23} /></div>
        <span className="app-update-eyebrow">تحديث جديد متاح</span>
        <h2 id="app-update-title">حدّث SportMatch</h2>
        <p className="app-update-version">الإصدار {update.version}</p>
        {update.notes && <p className="app-update-notes">{update.notes}</p>}
        <div className="app-update-actions">
          <button className="button button-primary" onClick={downloadUpdate} disabled={opening}>
            <ArrowDownToLine size={17} /> {opening ? 'جارٍ فتح التنزيل...' : 'تنزيل التحديث'}
          </button>
          <button className="button button-ghost" onClick={dismiss}><Clock3 size={16} /> لاحقًا</button>
        </div>
        <small className="app-update-hint">بعد التنزيل، وافق على تثبيت التحديث للاحتفاظ بحسابك وبياناتك.</small>
      </section>
    </div>
  );
}
