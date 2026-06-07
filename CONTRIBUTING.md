# 并行协作铁律（开工前必读）

四个人 + 各自的 AI agent 同时干活。下面这几条是为了**让大家不互相踩脚、联调时能对上**。3 小时很短，规矩越简单越好。

## 1. 目录所有权 —— 只改自己的目录

| 你是 | 只在这里写文件 |
|------|----------------|
| P1 | `src/` |
| P2 | `prompts/` |
| P3 | `content/` |
| P4 | `design/` |

- **不要改别人的目录。** 需要别人改东西 → 群里喊一声，或提 issue。
- `docs/`、`README.md` 谁都能补，但改之前看一眼别人是不是正在改同一段。

## 2. `shared/` 是冻结契约，改它要全员同意 ❄️

`shared/contract.ts` 是前端、Prompt、内容三方的**唯一接口约定**。
- 谁都可以**读**，import 里面的常量。
- 要**改字段** → 必须群里喊 + 三方确认，因为一改就可能让别人的代码 / prompt 对不上。
- 加字段一般安全，**改名 / 删字段 / 改结构**最危险，务必同步。

## 3. 分支策略（轻量，适配 hackathon）

```bash
# 每人开自己的分支
git checkout -b p1-frontend     # p2-prompts / p3-content / p4-design

# 频繁小步提交
git add src/                    # 只 add 自己的目录，避免误带别人改动
git commit -m "p1: 完成场景选择屏"

# 推上去、开 PR 合到 main
git push -u origin p1-frontend
```

- **commit 信息带前缀**：`p1:` / `p2:` / `p3:` / `p4:`，一眼看出谁干的。
- 因为目录不重叠，PR 合并基本不会冲突。真冲突了（多半在 `shared/` 或 `docs/`）→ 群里喊，别硬 merge。
- main 分支保持随时可 demo，别往 main 直推半成品。

## 4. 联调约定

- 前端（P1）默认 `VITE_USE_MOCK=true`，靠 `shared/mock-responses/` 空跑。**不依赖 P2 完成**。
- P2 的 prompt 产出必须能被 `JSON.parse` 且字段匹配 `shared/contract.ts`。拿 `mock-responses/round-sample.json` 当输出标杆。
- P2 调通后，把 `VITE_USE_MOCK=false`，P1+P2 一起对真实返回格式。

## 5. 提交前自检（30 秒）

- [ ] 我只改了自己目录的文件？（`git status` 看一眼）
- [ ] 没动 `shared/contract.ts`？（动了就喊人）
- [ ] commit 信息带了 `pX:` 前缀？

---

需要更细的产品 / 流程 / prompt 设计，全在 [`docs/项目执行手册.md`](docs/项目执行手册.md)。
