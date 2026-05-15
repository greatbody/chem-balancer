# chem-balancer

化学方程式配平的纯前端 Web 应用，部署在 Cloudflare Pages 上。

## 功能

- 输入未配平的化学方程式 (支持 `=` / `->` / `→` 作为反应箭头)
- 支持嵌套括号、多原子团 (如 `Fe2(SO4)3`、`K3[Fe(CN)6]`)、结晶水 (如 `CuSO4·5H2O`)
- 一键填入示例方程式
- 基于精确有理数 (BigInt) 的高斯消元，避免浮点误差

## 算法

将配平问题转化为求矩阵零空间：
- 行 = 元素，列 = 物种 (反应物为正，产物为负)
- 求一个非平凡的零空间基向量
- 用分母 LCM 化为整数，再用 GCD 化简为最简整数比

## 开发

```bash
pnpm install
pnpm dev       # 本地开发
pnpm test      # 单元测试
pnpm build     # 生产构建到 dist/
pnpm deploy    # 部署到 Cloudflare Pages (需 wrangler login)
```

## 部署

已部署到 Cloudflare Pages，项目名 `chem-balancer`。
