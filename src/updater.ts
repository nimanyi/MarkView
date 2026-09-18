/**
 * 应用更新：检查 → 下载（带进度）→ 安装并重启。
 * - 更新源与签名公钥见 tauri.conf.json（plugins.updater）
 * - 签名私钥仅存在于构建环境（本地 .tauri/ 或 CI secrets），绝不入库
 * - 无更新服务器 / 网络不可达时 check() 会抛错，由调用方降级提示
 * - 支持多端点容灾：GitHub Releases → jsDelivr CDN → raw.githubusercontent
 */
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { t } from "./i18n";

/** 进度回调：写入状态栏提示区 */
export type UpdateStatus = (text: string) => void;

/** 可读的错误信息（网络 / 签名 / 无 endpoint 等） */
export function updateErrorText(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  // 网络连接类错误
  if (lower.includes("network") || lower.includes("timeout") || lower.includes("dns") || lower.includes("connection")) {
    return t("update.err.network");
  }
  // 端点全部 404 / 不可达
  if (lower.includes("404") || lower.includes("not found") || lower.includes("endpoint")) {
    return t("update.err.notfound");
  }
  // 签名验证失败
  if (lower.includes("signature") || lower.includes("verify") || lower.includes("integrity")) {
    return t("update.err.signature");
  }

  // 其他未知错误，保留原始信息
  const brief = raw.split("\n")[0].slice(0, 120);
  return t("update.failed", { err: brief });
}

/**
 * 检查并安装更新。无更新时返回 false；有更新则完成下载、安装并重启。
 */
export async function checkForUpdates(onStatus: UpdateStatus): Promise<boolean> {
  onStatus(t("update.checking"));
  const update = await check();
  if (update === null) {
    onStatus(t("update.latest"));
    return false;
  }
  onStatus(t("update.found", { version: update.version }));
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
            ? t("update.progress", { percent: Math.round((downloaded / total) * 100) })
            : t("update.bytes", { bytes: downloaded }),
        );
        break;
      case "Finished":
        onStatus(t("update.done"));
        break;
    }
  });
  await relaunch();
  return true;
}
