# 运行时视频目录

构建后可直接在服务器的 `videos/ted/` 或 `videos/math/` 目录中增加 MP4，无需重新构建前端。

每个目录中的 `index.json` 是播放清单，支持两种写法：

```json
[
  "example.mp4",
  { "file": "another-video.mp4", "title": "自定义显示标题" }
]
```

上传或删除视频后同步修改对应的 `index.json`，刷新页面即可。文件名区分大小写，必须与服务器上的 MP4 完全一致。
