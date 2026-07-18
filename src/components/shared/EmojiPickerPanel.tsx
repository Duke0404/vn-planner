import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react'

interface Props {
  onEmojiClick: (data: EmojiClickData) => void
}

export default function EmojiPickerPanel({ onEmojiClick }: Props) {
  return (
    <EmojiPicker
      theme={Theme.DARK}
      lazyLoadEmojis
      searchPlaceholder="Search emoji…"
      previewConfig={{ showPreview: false }}
      onEmojiClick={onEmojiClick}
      width={320}
      height={360}
    />
  )
}
