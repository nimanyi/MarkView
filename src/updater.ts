/**
 * 应用更新：检查 → 下载（带进度）→ 安装并重启。
 * - 更新源与签名公钥见 tauri.conf.json（plugins.updater）
 * - 签名私钥仅存在于构建环境（本地 .tauri/ 或 CI secrets），绝不入库
 * - 无更新服务器 / 网络不可达时 check() 会抛错，由调用方降级提示
 */
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/** 进度回调：写入状态栏提示区 */
export type UpdateStatus = (text: string) => void;

/** 可读的错误信息（网络 / 签名 / 无 endpoint 等） */
export function updateErrorText(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const brief = raw.split("\n")[0].slice(0, 120);
  return `检查更新失败：${brief}`;
}

/**
 * 检查并安装更新。无更新时返回 false；有更新则完成下载、安装并重启。
 */
export async function checkForUpdates(onStatus: UpdateStatus): Promise<boolean> {
  onStatus("正在检查更新…");
  const update = await check();
  if (update === null) {
    onStatus("已是最新版本");
    return false;
  }
  onStatus(`发现新版本 ${update.version}，下载中…`);
  let downloaded = 0;
  let total = 0;
  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? 0;
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        onStatus(
          total > 0
            ? `下载更新 ${Math.round((downloaded / total) * 100)}%`
            : `下载更新 ${downloaded} B`,
        );
        break;
      case "Finished":
        onStatus("下载完成，安装后自动重启…");
        break;
    }
  });
  await relaunch();
  return true;
}
