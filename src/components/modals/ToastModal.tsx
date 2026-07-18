// 轻量成功/信息提示 · 单个按钮关闭 · 替代 alert()

import { Button, Modal } from 'animal-island-ui';

interface Props {
  open: boolean;
  title?: string;
  message: string;
  okText?: string;
  onClose: () => void;
}

export default function ToastModal({ open, title = '提示', message, okText = '好的', onClose }: Props) {
  return (
    <Modal
      open={open}
      title={title}
      typewriter={false}
      onClose={onClose}
      width={420}
      footer={
        <div className="modal-footer">
          <Button type="primary" block onClick={onClose}>{okText}</Button>
        </div>
      }
    >
      <div className="modal-body">{message}</div>
    </Modal>
  );
}
