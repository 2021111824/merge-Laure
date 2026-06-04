# 部署这个游戏

这个目录已经是可直接部署的静态网站版本。

## 最简单的方法：GitHub Pages

1. 新建一个 GitHub 仓库，比如 `essay-merge-game`
2. 把这个目录里的全部文件上传到仓库根目录
3. 确认仓库根目录里有：
   - `index.html`
   - `style.css`
   - `game.js`
   - `assets/`
4. 打开 GitHub 仓库页面
5. 进入 `Settings`
6. 打开 `Pages`
7. 在 `Build and deployment` 里选择：
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`
8. 保存后等待几分钟
9. GitHub 会给你一个公开链接

## 更新网站

以后你只要替换这个目录里的文件，然后重新上传到 GitHub 仓库，就会自动更新网站。

## 注意

- 图片都在 `assets/` 目录
- 首页文件必须是 `index.html`
- 这是纯静态网页，不需要服务器
