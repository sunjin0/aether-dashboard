import {Button, Modal, ModalProps} from "antd";
import React, {useState} from "react";

interface Props extends ModalProps {
  buttonText: string,
  text: string
}

const Model = (props: Props) => {
  const {width, title, buttonText, text} = props
  const [open, setOpen] = useState(false)
  return <div>
    <Button type={"link"} onClick={() => setOpen(true)}>{buttonText}</Button>
    <Modal
      title={title}
      open={open}
      onOk={() => {
      }}
      onCancel={() => {
        setOpen(false)
      }}
      width={width}
      footer={null}
    >
      <div
        dangerouslySetInnerHTML={{__html: text}}
      />
    </Modal>
  </div>
}
export default Model
