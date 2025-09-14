"use client";

import { useEffect, useState } from "react";

interface Heading {
  level: number;
  text: string;
}

const buildNestedList = (headings: Heading[]) => {
  const result: any[] = [];
  const stack: { level: number; items: any[] }[] = [];

  headings.forEach((heading) => {
    const li = { text: heading.text, children: [] };

    while (stack.length && heading.level <= stack[stack.length - 1].level) {
      stack.pop();
    }

    if (stack.length === 0) {
      result.push(li);
      stack.push({ level: heading.level, items: [li] });
    } else {
      const parent =
        stack[stack.length - 1].items[stack[stack.length - 1].items.length - 1];
      parent.children.push(li);
      stack.push({ level: heading.level, items: [li] });
    }
  });

  return result;
};

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>("");

  const renderList = (items: any[]) => (
    <ul className="space-y-1">
      {items.map((h) => {
        const id = h.text.replace(/\s+/g, "-");
        const isActive = id === activeId;

        return (
          <li
            key={id}
            className={`list-none border-l pl-4 py-0.5 ${
              isActive ? "border-blue-400" : "border-transparent"
            }`}
          >
            <a
              href={`#${id}`}
              className={`block transition-colors duration-200 ${
                isActive
                  ? "text-blue-400 font-medium"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {h.text}
            </a>
            {h.children.length > 0 && (
              <div className="ml-4 mt-2">{renderList(h.children)}</div>
            )}
          </li>
        );
      })}
    </ul>
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-100px 0px -70% 0px" }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.text.replace(/\s+/g, "-"));
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  const nested = buildNestedList(headings);

  return <nav>{renderList(nested)}</nav>;
}
