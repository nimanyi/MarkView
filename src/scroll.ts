/**
 * 双向同步滚动：按可视区滚动比例联动。
 * 程序设置对侧 scrollTop 会触发对侧 scroll 事件（回声），
 * 以"各侧上次被程序设置的时间戳"识别并忽略 150ms 内的回声，
 * 避免双向互相拉扯的抖动。
 */
export function bindSyncScroll(a: HTMLElement, b: HTMLElement): void {
  const lastProgrammatic = { a: 0, b: 0 };

  const attach = (src: HTMLElement, dst: HTMLElement, srcKey: "a" | "b") => {
    src.addEventListener(
      "scroll",
      () => {
        const now = performance.now();
        if (now - lastProgrammatic[srcKey] < 150) return; // 回声事件
        const srcMax = src.scrollHeight - src.clientHeight;
        const dstMax = dst.scrollHeight - dst.clientHeight;
        if (srcMax <= 0 || dstMax <= 0) return;
        lastProgrammatic[srcKey === "a" ? "b" : "a"] = now;
        dst.scrollTop = (src.scrollTop / srcMax) * dstMax;
      },
      { passive: true },
    );
  };

  attach(a, b, "a");
  attach(b, a, "b");
}
