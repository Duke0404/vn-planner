import { memo, type MouseEvent } from 'react'
import Markdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

interface Props {
  children: string
  className?: string
}

function stopLinkClick(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation()
}

export const MarkdownText = memo(function MarkdownText({ children, className }: Props) {
  return (
    <span className={className}>
      <Markdown
        remarkPlugins={[remarkBreaks]}
        allowedElements={['p', 'strong', 'em', 'del', 'code', 'a', 'br']}
        unwrapDisallowed
        components={{
          p: ({ children: content }) => <span className="md-p">{content}</span>,
          a: ({ href, children: content }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" onClick={stopLinkClick}>
              {content}
            </a>
          ),
        }}
      >
        {children}
      </Markdown>
    </span>
  )
})
