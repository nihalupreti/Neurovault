"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownViewer({ markdown }: { markdown: string }) {
  const HeadingRenderer = (props: any) => {
    console.log("this", props);
    const Tag = props.node.tagName;
    const id = props.children.toString().replace(/\s+/g, "-");
    return <Tag id={id} {...props} className="scroll-mt-32" />;
  };

  return (
    <>
      <Markdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        components={Object.fromEntries(
          [1, 2, 3, 4, 5, 6].map((l) => [`h${l}`, HeadingRenderer])
        )}
      >
        {markdown}
      </Markdown>
    </>
  );
}
