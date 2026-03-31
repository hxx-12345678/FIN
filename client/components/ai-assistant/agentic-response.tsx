"use client"

import * as React from 'react'
import { useState, Fragment } from 'react'
import Markdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

interface AgenticResponseProps {
  content: string
  isUser?: boolean
}

export function AgenticResponse({ content, isUser = false }: AgenticResponseProps) {
  if (isUser) {
    return (
      <span className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-foreground/90 font-medium font-sans antialiased">
        {content}
      </span>
    )
  }

  const markdownComponents: Components = {
    // High-fidelity layout containers derived from className
    div: ({ className, children, ...props }) => {
      if (className === 'metric-grid') {
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5 my-10" {...props}>
            {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                return (
                  <div className="flex flex-col gap-2 p-5 rounded-2xl border border-white/5 bg-[#121212] shadow-xl hover:bg-[#1a1a1a] transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {child.props.children}
                  </div>
                )
              }
              return child;
            })}
          </div>
        )
      }
      if (className === 'execution-flow') {
        return <div className="flex flex-wrap items-center gap-4 p-6 my-8 rounded-2xl bg-[#0f1015] border border-white/5" {...props}>{children}</div>
      }
      if (className?.includes('priority-card')) {
         const isWinNow = className.includes('win-now')
         const isPossible = className.includes('possible')
         const isHard = className.includes('hard')
         
         const colorBorder = isWinNow ? 'border-emerald-500/30' : isPossible ? 'border-blue-500/30' : isHard ? 'border-amber-500/30' : 'border-red-500/30'
         const colorBg = isWinNow ? 'bg-emerald-950/20' : isPossible ? 'bg-blue-950/20' : isHard ? 'bg-amber-950/20' : 'bg-red-950/20'
         
         return (
           <div className={`p-6 rounded-2xl border ${colorBorder} ${colorBg} shadow-sm group/priority my-6 relative overflow-hidden`} {...props}>
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
             <div className="relative z-10">{children}</div>
           </div>
         )
      }
      if (className === 'info-box') {
        return <div className="my-8 p-6 rounded-2xl border border-white/10 bg-[#161618] text-slate-300" {...props}>{children}</div>
      }
      if (className === 'grid-2-col') {
        return <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8" {...props}>{children}</div>
      }
      return <div className={className} {...props}>{children}</div>
    },
    
    span: ({ className, children, ...props }) => {
      if (className === 'flow-arrow') {
        return <span className="text-muted-foreground/30 font-bold mx-1" {...props}>→</span>
      }
      if (className === 'flow-step') {
        return (
          <span className="px-3 py-1.5 rounded-xl bg-muted/60 border border-border/50 text-[12px] font-bold shadow-sm" {...props}>
            {children}
          </span>
        )
      }
      return <span className={className} {...props}>{children}</span>
    },

    // Headings — Clean, high-authority typography
    h1: ({ children, ...props }) => (
      <h1 className="text-[28px] font-extrabold mt-12 mb-8 text-foreground tracking-tight flex items-center gap-4 group" {...props}>
        <div className="w-2 h-10 rounded-full bg-gradient-to-b from-indigo-500 to-purple-600 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
        <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{children}</span>
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-xl font-bold mt-9 mb-4 text-foreground tracking-tight border-b border-border/40 pb-2 w-fit pr-10" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-[16px] font-extrabold mt-8 mb-3 text-foreground/90 uppercase tracking-[0.2em]" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 className="text-[15px] font-bold mt-6 mb-3 text-foreground/80 leading-tight" {...props}>{children}</h4>
    ),

    // Paragraphs — Institutional spacing (Inter-like)
    p: ({ children, ...props }) => (
      <p className="text-[14.5px] leading-[1.7] mb-6 text-foreground/85 last:mb-0 font-normal antialiased" {...props}>
        {children}
      </p>
    ),

    // Lists — Structured and legible
    ul: ({ children, ...props }) => (
      <ul className="mb-6 ml-2 space-y-3" {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="mb-6 ml-2 space-y-3 list-decimal list-inside" {...props}>{children}</ol>
    ),
    li: ({ children, ...props }) => (
      <li className="text-[14.5px] leading-relaxed text-foreground/90 flex items-start gap-4 pr-4" {...props}>
        <span className="text-primary/50 mt-[10px] flex-shrink-0 w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_rgba(var(--primary),0.3)]" />
        <span className="flex-1">{children}</span>
      </li>
    ),

    // Enhanced Code Blocks with Copy Button
    code: ({ className, children, ...props }) => {
      const isInline = !className
      const codeString = String(children).replace(/\n$/, '')
      
      if (isInline) {
        return (
          <code className="bg-muted/60 px-2 py-0.5 rounded-[6px] text-[13px] font-mono font-bold border border-border/20 text-indigo-600 dark:text-indigo-400" {...props}>
            {children}
          </code>
        )
      }

      return <CodeBlock language={className?.replace('language-', '') || 'text'} content={codeString} />
    },

    // Tables — Financial Grade
    table: ({ children, ...props }) => (
      <div className="my-10 overflow-x-auto rounded-2xl border border-white/10 bg-[#0d0d0f] shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
        <table className="w-full text-[14px] border-collapse min-w-[600px] relative z-10" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="bg-[#1a1a1e] border-b border-white/10" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }) => (
      <tbody className="divide-y divide-white/5" {...props}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }) => (
      <tr className="hover:bg-white/[0.02] transition-colors group/row" {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }) => (
      <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="px-6 py-5 text-slate-300 font-medium border-none group-hover/row:text-white transition-colors" {...props}>
        {children}
      </td>
    ),

    // Blockquotes — Insightful callouts
    blockquote: ({ children, ...props }) => (
      <blockquote className="my-8 pl-8 border-l-4 border-indigo-500/40 bg-indigo-500/5 rounded-r-3xl py-6 text-foreground/95 italic text-[15.5px] shadow-sm leading-relaxed" {...props}>
        {children}
      </blockquote>
    ),

    // Horizontal rule
    hr: (props) => (
      <hr className="my-10 border-none h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" {...props} />
    ),

    // Links
    a: ({ href, children, ...props }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary font-bold hover:underline decoration-primary/40 underline-offset-4 transition-all"
        {...props}
      >
        {children}
      </a>
    ),
  }

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSanitize]}
      components={markdownComponents}
    >
      {content}
    </Markdown>
  )
}

function CodeBlock({ language, content }: { language: string, content: string }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-border/60 bg-[#0d0e12] shadow-lg group/code">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#16181d] border-b border-white/5 text-[11px] text-muted-foreground/80 font-mono">
        <span className="uppercase tracking-[0.2em] font-bold text-[9px] text-muted-foreground/60">{language}</span>
        <button 
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 hover:text-white transition-colors py-1 px-2 rounded-md hover:bg-white/5"
        >
          {copied ? (
            <Fragment>
              <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-500">Copied</span>
            </Fragment>
          ) : (
            <Fragment>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Copy</span>
            </Fragment>
          )}
        </button>
      </div>
      <pre className="p-5 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <code className="text-[13.5px] font-mono text-slate-300 leading-relaxed block">
          {content}
        </code>
      </pre>
    </div>
  )
}
