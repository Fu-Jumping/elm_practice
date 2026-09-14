<script setup lang="ts">
/**
 * 爆红包全屏浮层（CHG-001 TODO-USER-029，契约 §3.10、PRD 7.16.1「爆红包过渡态」「爆出结果」两行）
 * 视觉真源：docs/design/exports/用户端/11-天天必爆/02-爆红包过渡态/、03-爆出结果/（截图逐区核对）
 *
 * 状态机：
 * - `idle`     过渡态：金光放射 + 横幅「天天必爆 · 正在爆出专属红包」+ 红包卡与金色「爆」按钮
 *              +「最高 ¥18.8 正在破封」+ 欧气进度条 + 关闭按钮
 * - `blasting` 点「爆」后播动效并等接口返回（PRD：≤3.5 秒，超时给轻量等待提示）；提供「跳过」
 * - `result`   结果卡：金额与门槛**一律按接口返回展示**（不自行计算）+ 限今天 23:59 前使用
 *              + 已放入「我的红包」+ 主按钮「去使用，立即抵扣」
 * - `blocked`  免费次数已用完：给「消耗一张红包再爆」（传 couponId，替换式）或「去购买」
 * - `failed`   接口失败：浮层保留并原地可重试（失败不消耗免费次数与红包，事务边界由后端保证）
 * 音效：以 Web Audio 合成短音；**不可用时静默降级**（try/catch，不影响结果与验收）
 */
import { onBeforeUnmount, ref } from 'vue'
import { couponApi } from '@/services/api'
import { formatMoneyCompact } from '@/services/normalizers'
import type { CouponRecord } from '@/services/api/types'

const props = defineProps<{
  /** 可消耗的已购券 id（列表内首张 canBlast 券）；为空时阻塞态只给「去购买」 */
  blastableCouponId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  /** 爆出成功（券已入库）：父组件据此刷新列表 */
  (e: 'done'): void
  /** 阻塞态选「去购买」：父组件关闭浮层并打开买红包浮窗 */
  (e: 'buy'): void
}>()

type Phase = 'idle' | 'blasting' | 'result' | 'blocked' | 'failed'

const phase = ref<Phase>('idle')
const result = ref<CouponRecord | null>(null)
/** 本次是否为免费爆（免费爆新增券、消耗券爆为替换式，文案口径不同） */
const freeBlast = ref(false)
/** 超过 3.5 秒仍未返回时的轻量等待提示（PRD 879 行加载口径） */
const slowHint = ref(false)
let slowTimer: ReturnType<typeof setTimeout> | undefined
/** 动效计时与提前结束句柄（「跳过」只跳过动效，不跳过接口结果） */
let animationTimer: ReturnType<typeof setTimeout> | undefined
let animationResolve: (() => void) | undefined

/** 音效：Web Audio 合成短音；环境不支持或被拦截时静默降级（PRD 879 行检查列） */
function playBlastSound(): void {
  try {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(660, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.18)
    gain.gain.setValueAtTime(0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.2)
  } catch {
    // 音频不可用：静默降级，不影响爆红包结果与验收
  }
}

function clearTimers(): void {
  if (slowTimer) {
    clearTimeout(slowTimer)
    slowTimer = undefined
  }
  if (animationTimer) {
    clearTimeout(animationTimer)
    animationTimer = undefined
  }
}

/** 跳过动效：立即结束等待动画（接口结果照常返回后展示结果卡） */
function skipAnimation(): void {
  if (animationTimer) {
    clearTimeout(animationTimer)
    animationTimer = undefined
  }
  animationResolve?.()
}

onBeforeUnmount(clearTimers)

/**
 * 点「爆」：播动效 + 调接口。不传 `couponId` 走当日免费次数，传则消耗并替换该券。
 * 动效时长 ≥ 900ms：接口过快时也保证动效可感知（PRD 879 行：先播动效再出结果）
 */
async function burst(couponId?: string): Promise<void> {
  phase.value = 'blasting'
  slowHint.value = false
  clearTimers()
  const animation = new Promise<void>((resolve) => {
    animationResolve = resolve
  })
  animationTimer = setTimeout(() => animationResolve?.(), 900)
  slowTimer = setTimeout(() => {
    slowHint.value = true
  }, 3500)
  playBlastSound()
  try {
    const [blasted] = await Promise.all([couponApi.blastCoupon(couponId), animation])
    result.value = blasted.coupon
    freeBlast.value = blasted.free
    phase.value = 'result'
    emit('done')
  } catch (err) {
    // 业务拒绝（4xx）→ 阻塞态：免费/券不可用都是"这次爆不成"，应给出可继续操作的入口
    // （409 免费次数用尽、404 券不存在/他人券、400 参数非法等），并让页面重读券列表，
    // 避免用户拿着已失效的券反复重试；只有网络异常或服务端 5xx 才落"失败态可重试"
    // （2026-09-14 线上复现：过期券被当成"网络异常，请重试"，用户只能干等）
    const status = (err as { status?: number }).status ?? 0
    if (status >= 400 && status < 500) {
      emit('done')
      phase.value = 'blocked'
    } else {
      phase.value = 'failed'
    }
  } finally {
    clearTimers()
  }
}

/** 「去使用，立即抵扣」：券已入列表，关闭浮层回红包页（PRD 880 行交互列） */
function onUse(): void {
  emit('close')
}

function onBuy(): void {
  emit('buy')
}

function close(): void {
  emit('close')
}
</script>

<template>
  <div class="blast-overlay" data-testid="blast-overlay">
    <div class="blast-rays" aria-hidden="true" />

    <!-- 过渡态 / 动效中 -->
    <template v-if="phase === 'idle' || phase === 'blasting'">
      <p class="blast-banner" data-testid="blast-banner">
        <span aria-hidden="true">🔥</span>
        天天必爆 · 正在爆出专属红包
        <span aria-hidden="true">🔥</span>
      </p>

      <section class="blast-card" data-testid="blast-card">
        <div class="blast-flap" aria-hidden="true" />
        <button
          class="blast-burst"
          type="button"
          data-testid="blast-burst-btn"
          :disabled="phase === 'blasting'"
          @click="burst()"
        >
          <span class="blast-burst-char">爆</span>
          <span class="blast-burst-tip">立减</span>
        </button>
        <p class="blast-card-title">超大红包</p>
        <p class="blast-card-sub">最高 ¥18.8 正在破封</p>
      </section>

      <p class="blast-waiting">大奖正在赶来…</p>
      <div class="blast-progress" data-testid="blast-progress">
        <span class="blast-progress-fill" :class="{ 'is-running': phase === 'blasting' }" />
      </div>
      <p class="blast-tip">
        <span aria-hidden="true">✨</span>
        {{
          phase === 'blasting'
            ? slowHint
              ? '网络较慢，仍在爆出中…'
              : '欧气凝爆中，大奖即将出炉'
            : '点击「爆」从 10 档奖池随机开出红包'
        }}
        <span aria-hidden="true">✨</span>
      </p>
      <button
        v-if="phase === 'blasting'"
        class="blast-skip"
        type="button"
        data-testid="blast-skip"
        @click="skipAnimation"
      >
        跳过
      </button>
    </template>

    <!-- 结果卡 -->
    <template v-else-if="phase === 'result' && result">
      <p class="blast-banner" data-testid="blast-result-banner">
        <span aria-hidden="true">✨</span>
        {{ freeBlast ? '恭喜获得天天必爆专属红包！' : '红包已升级为专属红包！' }}
        <span aria-hidden="true">✨</span>
      </p>
      <section class="blast-result" data-testid="blast-result">
        <p class="blast-result-head">
          <span class="blast-result-amount" data-testid="blast-result-amount">
            <span class="blast-result-yen">¥</span>{{ formatMoneyCompact(result.amount) }}
          </span>
          <span class="blast-result-body">
            <span class="blast-result-name-row">
              <span class="blast-result-scope">通用券</span>
              <span class="blast-result-name">{{ result.name }}</span>
            </span>
            <span class="blast-result-threshold" data-testid="blast-result-threshold">
              {{ result.threshold > 0 ? `满${formatMoneyCompact(result.threshold)}元可用` : '无门槛可用' }}
            </span>
          </span>
        </p>
        <p class="blast-result-expiry" data-testid="blast-result-expiry">
          限今天 23:59 前使用 · 快去下单
        </p>
        <p class="blast-result-note" data-testid="blast-result-note">已放入「我的红包」</p>
      </section>
      <button class="blast-use" type="button" data-testid="blast-use-btn" @click="onUse">
        去使用，立即抵扣
        <span class="blast-use-sub">即将失效，马上点餐</span>
      </button>
    </template>

    <!-- 阻塞态：免费次数已用完 -->
    <section v-else-if="phase === 'blocked'" class="blast-result blast-panel" data-testid="blast-blocked">
      <p class="blast-panel-title">今日免费次数已用完</p>
      <p class="blast-panel-desc">
        {{
          props.blastableCouponId
            ? '可消耗一张已购红包再爆一次（原红包将被替换）'
            : '暂无可消耗的红包，去购买后再来'
        }}
      </p>
      <button
        v-if="props.blastableCouponId"
        class="blast-use"
        type="button"
        data-testid="blast-spend-btn"
        @click="burst(props.blastableCouponId)"
      >
        消耗一张红包再爆
      </button>
      <button class="blast-secondary" type="button" data-testid="blast-buy-btn" @click="onBuy">
        去购买红包
      </button>
    </section>

    <!-- 失败态：原地重试 -->
    <section v-else class="blast-result blast-panel" data-testid="blast-failed">
      <p class="blast-panel-title">爆红包失败，请重试</p>
      <p class="blast-panel-desc">网络异常，未消耗免费次数与红包</p>
      <button class="blast-use" type="button" data-testid="blast-retry-btn" @click="burst()">重试</button>
    </section>

    <button class="blast-close" type="button" data-testid="blast-close" aria-label="关闭" @click="close">×</button>
  </div>
</template>

<style scoped>
/* 全屏覆盖 + 金光放射（CHG-001 视觉例外：红包模块保留红金） */
.blast-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  background: rgba(20, 0, 0, 0.72);
  overflow: hidden;
}

.blast-rays {
  position: absolute;
  inset: -40%;
  background: conic-gradient(
    from 0deg,
    rgba(255, 214, 0, 0.55) 0deg 12deg,
    rgba(255, 120, 0, 0) 12deg 24deg,
    rgba(255, 214, 0, 0.55) 24deg 36deg,
    rgba(255, 120, 0, 0) 36deg 48deg
  );
  opacity: 0.55;
  animation: blast-rotate 12s linear infinite;
}

@keyframes blast-rotate {
  to {
    transform: rotate(360deg);
  }
}

.blast-banner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  background-image: linear-gradient(90deg, #ff5a1f 0%, #ffd700 50%, #fff59d 100%);
  font-size: 14px;
  font-weight: 700;
  color: #7a1c00;
}

/* 红包卡（设计稿：161.41deg 红金渐变 + 顶部封口） */
.blast-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 280px;
  padding: 56px 20px 24px;
  border-radius: 20px;
  background-image: linear-gradient(
    161.41deg,
    #e60039 -2.09%,
    #ff1e36 27.08%,
    #ff5024 65.63%,
    #ff732e 102.09%
  );
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
}

.blast-flap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 46px;
  border-radius: 20px 20px 40% 40%;
  background: linear-gradient(180deg, #ff3c14 0%, #e6002a 80%, #b71c1c 100%);
}

/* 金色「爆」按钮（设计稿：135deg 金渐变 + 深红字） */
.blast-burst {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border: 2px solid #fff3c4;
  border-radius: 20px;
  background-image: linear-gradient(135deg, #fffde0 0%, #ffd700 45%, #ffa000 85%, #ff6f00 100%);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

.blast-burst:disabled {
  opacity: 0.85;
}

.blast-burst-char {
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  color: #b71c1c;
}

.blast-burst-tip {
  font-size: 10px;
  color: #b71c1c;
}

.blast-card-title {
  position: relative;
  z-index: 1;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.blast-card-sub {
  position: relative;
  z-index: 1;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.blast-waiting {
  position: relative;
  z-index: 1;
  font-size: 13px;
  color: #fff;
}

.blast-tip {
  position: relative;
  z-index: 1;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
}

/* 欧气进度条（设计稿：浅金轨道 + 橙金填充） */
.blast-progress {
  position: relative;
  z-index: 1;
  width: 240px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 245, 157, 0.35);
  overflow: hidden;
}

.blast-progress-fill {
  display: block;
  width: 12%;
  height: 100%;
  border-radius: 999px;
  background-image: linear-gradient(90deg, #ff5a1f 0%, #ffd700 50%, #fff59d 100%);
  transition: width 0.6s ease;
}

.blast-progress-fill.is-running {
  width: 92%;
}

.blast-skip {
  position: relative;
  z-index: 1;
  padding: 4px 14px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 12px;
}

/* 结果卡（设计稿：红金外壳 + 内层白卡 + 金色主按钮） */
.blast-result {
  position: relative;
  z-index: 1;
  width: 280px;
  padding: 28px 16px 16px;
  border-radius: 12px;
  background-image: linear-gradient(
    164.89deg,
    #e6002a 0.13%,
    #ff334b 25.07%,
    #ff5a1f 69.95%,
    #ff7a45 99.87%
  );
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

/* 内层白卡（设计稿：180deg 白→米渐变） */
.blast-result::before {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 8px;
  background-image: linear-gradient(180deg, #ffffff 0%, #fff8ee 60%, #ffe8ca 100%);
}

.blast-result > * {
  position: relative;
  z-index: 1;
}

.blast-result-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.blast-result-amount {
  font-size: 30px;
  font-weight: 700;
  color: #ff5a1f;
}

.blast-result-yen {
  font-size: 16px;
}

.blast-result-body {
  flex: 1;
  min-width: 0;
}

.blast-result-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.blast-result-scope {
  flex: none;
  padding: 1px 4px;
  border: 1px solid #ffb59e;
  border-radius: 2px;
  background: rgba(255, 219, 208, 0.3);
  font-size: 10px;
  color: #ff5a1f;
}

.blast-result-name {
  font-size: 15px;
  font-weight: 700;
  color: #1a1c1c;
}

.blast-result-threshold {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: #666;
}

.blast-result-expiry {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #e5e5e5;
  font-size: 12px;
  color: #d81b1b;
}

.blast-result-note {
  margin-top: 4px;
  font-size: 11px;
  color: #999;
}

/* 金色主按钮（设计稿：180deg 金渐变 + 深红字） */
.blast-use {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 280px;
  margin-top: 12px;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background-image: linear-gradient(180deg, #fff6b8 0%, #ffd000 60%, #ff9500 100%);
  font-size: 16px;
  font-weight: 700;
  color: #a02000;
}

.blast-use-sub {
  font-size: 10px;
  font-weight: 500;
}

.blast-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-top: 20px;
}

.blast-panel-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1c1c;
}

.blast-panel-desc {
  font-size: 12px;
  color: #666;
  text-align: center;
}

.blast-secondary {
  position: relative;
  z-index: 1;
  width: 280px;
  margin-top: 8px;
  padding: 10px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  color: #666;
}

.blast-close {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-top: 8px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 20px;
  line-height: 1;
}
</style>
