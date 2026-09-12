# 占位资产（RhineLabUI 上游，仅开发期使用）

| 文件 | 来源 | 体积 | 用途 |
|---|---|---|---|
| `archive-cassette.glb` | LBEILC/RhineLabUI `public/assets/archive-cassette.glb`（HEAD `d9ecb6c`） | 3.4 MB | 方案 B（3D 档案阵列）的档案盒占位模型 |

## 许可与风险

- 上游自写代码为 MIT，但 **GLB 模型属对《明日方舟》官方视觉的复刻，仓库明确声明不随 MIT 授权**。
- 因此本文件**仅作开发期占位**：用于验证材质（透射/折射）、镜头编排、性能与交互手感。
- **公开上线前必须替换为原创模型**（可用 `art/build_archive.py` 的建模思路重做几何，或直接以程序化几何替代——demo 04 内置了程序化兜底）。
- 模型内含 17 个网格、17 个材质（Frosted_Polymer / Amber_Optical_Inlay / Optical_Diffuser / Printed_Label 等），无贴图、无动画。

## 复现方式

```bash
git clone --depth 1 https://github.com/LBEILC/RhineLabUI.git /tmp/RhineLabUI
cp /tmp/RhineLabUI/public/assets/archive-cassette.glb design-demos/rhine-lab/assets/
```
