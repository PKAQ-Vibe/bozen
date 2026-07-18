// 作业提交 modal · 在孩子点"完成任务"时弹出
// 允许写完成说明 + 上传照片（自动压到 640px 宽，最多 3 张）

import { useState } from 'react';
import { Button, Modal, Tag } from 'animal-island-ui';
import { Camera, Trash2 } from 'lucide-react';
import './PublishTaskModal.css';

interface Props {
  open: boolean;
  taskTitle: string;
  initialText?: string;
  initialImages?: string[];
  onClose: () => void;
  onSubmit: (data: { text: string; images: string[] }) => void;
}

const MAX_IMAGES = 3;
const MAX_WIDTH = 640;
const JPEG_QUALITY = 0.75;

async function compressImage(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bmp.width);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas ctx null');
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

export default function SubmissionModal({ open, taskTitle, initialText, initialImages, onClose, onSubmit }: Props) {
  const [text, setText] = useState(initialText ?? '');
  const [images, setImages] = useState<string[]>(initialImages ?? []);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr('');
    setUploading(true);
    try {
      const next = [...images];
      for (const f of Array.from(files)) {
        if (next.length >= MAX_IMAGES) break;
        if (!f.type.startsWith('image/')) continue;
        const dataUrl = await compressImage(f);
        next.push(dataUrl);
      }
      setImages(next);
    } catch (e) {
      setErr('图片处理失败：' + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal
      open={open}
      title={`提交完成 · ${taskTitle}`}
      typewriter={false}
      onClose={onClose}
      width={560}
      footer={
        <div className="modal-footer">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={() => onSubmit({ text: text.trim(), images })}>
            提交给家长审核
          </Button>
        </div>
      }
    >
      <div className="publish-task-form">
        <div className="publish-task-row">
          <label className="publish-task-label">完成说明（选填 · ≤500 字）</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder="写一句你做了什么、遇到什么问题 · 家长审核时会看到"
            rows={5}
            style={{
              width: '100%',
              padding: 10,
              fontFamily: 'inherit',
              fontSize: 16,
              border: '1px solid var(--c-border)',
              borderRadius: 8,
              resize: 'vertical',
            }}
          />
          <div style={{ fontSize: 16, color: 'var(--c-muted)', textAlign: 'right' }}>{text.length} / 500</div>
        </div>

        <div className="publish-task-row">
          <label className="publish-task-label">作业照片（选填 · 最多 {MAX_IMAGES} 张 · 自动压到 640px）</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {images.map((src, i) => (
              <div key={i} style={{ position: 'relative', width: 96, height: 96 }}>
                <img src={src} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--c-border)' }} />
                <button
                  type="button"
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                  style={{
                    position: 'absolute',
                    top: 4, right: 4,
                    width: 20, height: 20,
                    borderRadius: 10,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <label
                style={{
                  width: 96, height: 96,
                  border: '2px dashed var(--c-border)',
                  borderRadius: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  color: 'var(--c-muted)',
                  fontSize: 16,
                }}
              >
                <Camera size={20} />
                {uploading ? '处理中...' : '添加'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => onPickFiles(e.target.files)}
                />
              </label>
            )}
          </div>
          <Tag size="small" color={images.length > 0 ? 'app-green' : 'default'}>
            已选 {images.length} / {MAX_IMAGES} 张 · 图片会占用本地空间，建议每周备份
          </Tag>
        </div>

        {err && <div className="publish-task-err">{err}</div>}
      </div>
    </Modal>
  );
}
