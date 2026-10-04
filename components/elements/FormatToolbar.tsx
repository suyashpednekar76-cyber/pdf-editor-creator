"use client";

import type { Element, TableElement, TableCell, Align, FontFamily, ListStyle } from "@/lib/elements";

function Btn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`grid h-8 min-w-8 place-items-center rounded-md border px-2 text-sm ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-6 w-px bg-slate-200" />;
}

export default function FormatToolbar({
  element,
  cellCoords,
  cell,
  onPatch,
  onCellPatch,
  onTableOp,
  onDelete,
}: {
  element: Element | null;
  cellCoords: [number, number] | null;
  cell: TableCell | null;
  onPatch: (patch: Partial<Element>) => void;
  onCellPatch: (patch: Partial<TableElement["cells"][number][number]>) => void;
  onTableOp: (op: "addRow" | "delRow" | "addCol" | "delCol") => void;
  onDelete: () => void;
}) {
  if (!element) {
    return (
      <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-400">
        Select an element to format it, or insert text / a table.
      </div>
    );
  }

  const aligns: Align[] = ["left", "center", "right"];
  const alignIcon = { left: "⫷", center: "≡", right: "⫸" } as const;

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2">
      {(element.kind === "text" || element.kind === "table") && (
        <>
          <select
            value={element.fontFamily}
            onChange={(e) => onPatch({ fontFamily: e.target.value as FontFamily } as Partial<Element>)}
            className="h-8 rounded-md border border-slate-300 px-2 text-sm"
          >
            <option value="Helvetica">Helvetica</option>
            <option value="Times">Times</option>
            <option value="Courier">Courier</option>
          </select>
          <select
            value={element.fontSize}
            onChange={(e) => onPatch({ fontSize: +e.target.value } as Partial<Element>)}
            className="h-8 rounded-md border border-slate-300 px-1 text-sm"
          >
            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Sep />
        </>
      )}

      {element.kind === "text" && (
        <>
          <Btn active={element.bold} title="Bold" onClick={() => onPatch({ bold: !element.bold } as Partial<Element>)}>
            <b>B</b>
          </Btn>
          <Btn active={element.italic} title="Italic" onClick={() => onPatch({ italic: !element.italic } as Partial<Element>)}>
            <i>I</i>
          </Btn>
          <Btn active={element.underline} title="Underline" onClick={() => onPatch({ underline: !element.underline } as Partial<Element>)}>
            <u>U</u>
          </Btn>
          <Btn active={element.strike} title="Strikethrough" onClick={() => onPatch({ strike: !element.strike } as Partial<Element>)}>
            <s>S</s>
          </Btn>
          <Sep />
          <label className="flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs text-slate-500">
            A
            <input
              type="color"
              value={element.color}
              onChange={(e) => onPatch({ color: e.target.value } as Partial<Element>)}
              className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
          <label className="flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs text-slate-500">
            <span title="Highlight">▟</span>
            <input
              type="color"
              value={element.highlight === "none" ? "#fde68a" : element.highlight}
              onChange={(e) => onPatch({ highlight: e.target.value } as Partial<Element>)}
              className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
            />
            <button
              type="button"
              title="No highlight"
              onClick={() => onPatch({ highlight: "none" } as Partial<Element>)}
              className="text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          </label>
          <Sep />
          {aligns.map((a) => (
            <Btn key={a} active={element.align === a} title={`Align ${a}`} onClick={() => onPatch({ align: a } as Partial<Element>)}>
              {alignIcon[a]}
            </Btn>
          ))}
          <Sep />
          <Btn active={element.list === "bullet"} title="Bulleted list" onClick={() => onPatch({ list: (element.list === "bullet" ? "none" : "bullet") as ListStyle } as Partial<Element>)}>
            •
          </Btn>
          <Btn active={element.list === "number"} title="Numbered list" onClick={() => onPatch({ list: (element.list === "number" ? "none" : "number") as ListStyle } as Partial<Element>)}>
            1.
          </Btn>
          <Sep />
          <label className="flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs text-slate-500" title="Line spacing">
            ↕
            <select
              value={element.lineHeight}
              onChange={(e) => onPatch({ lineHeight: +e.target.value } as Partial<Element>)}
              className="bg-transparent text-sm text-slate-700"
            >
              {[1, 1.15, 1.3, 1.5, 2].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {element.kind === "table" && (
        <>
          <Btn title="Add row" onClick={() => onTableOp("addRow")}>+Row</Btn>
          <Btn title="Delete row" onClick={() => onTableOp("delRow")}>−Row</Btn>
          <Btn title="Add column" onClick={() => onTableOp("addCol")}>+Col</Btn>
          <Btn title="Delete column" onClick={() => onTableOp("delCol")}>−Col</Btn>
          <Sep />
          <label className="flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs text-slate-500" title="Border width">
            ▭
            <select
              value={element.borderWidth}
              onChange={(e) => onPatch({ borderWidth: +e.target.value } as Partial<Element>)}
              className="bg-transparent text-sm text-slate-700"
            >
              {[0, 0.5, 1, 1.5, 2, 3].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs text-slate-500" title="Border colour">
            ✎
            <input type="color" value={element.borderColor} onChange={(e) => onPatch({ borderColor: e.target.value } as Partial<Element>)} className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" />
          </label>
          <label className="flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs text-slate-500" title="Header fill">
            H
            <input type="color" value={element.headerFill === "none" ? "#eef2ff" : element.headerFill} onChange={(e) => onPatch({ headerFill: e.target.value } as Partial<Element>)} className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" />
            <button type="button" title="No header fill" onClick={() => onPatch({ headerFill: "none" } as Partial<Element>)} className="text-slate-400 hover:text-slate-700">✕</button>
          </label>
          <label className="flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs text-slate-500" title="Cell padding">
            ⬚
            <select value={element.cellPadding} onChange={(e) => onPatch({ cellPadding: +e.target.value } as Partial<Element>)} className="bg-transparent text-sm text-slate-700">
              {[2, 4, 6, 8, 10, 12].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {cellCoords && (
            <>
              <Sep />
              <span className="text-xs text-slate-400">Cell:</span>
              {(["left", "center", "right"] as Align[]).map((a) => (
                <Btn key={a} title={`Cell align ${a}`} onClick={() => onCellPatch({ align: a })}>
                  {alignIcon[a]}
                </Btn>
              ))}
              <Btn active={!!cell?.bold} title="Cell bold" onClick={() => onCellPatch({ bold: !cell?.bold })}>
                <b>B</b>
              </Btn>
              <Btn active={!!cell?.italic} title="Cell italic" onClick={() => onCellPatch({ italic: !cell?.italic })}>
                <i>I</i>
              </Btn>
              <label className="flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs text-slate-500" title="Cell text colour">
                A
                <input type="color" value={cell?.color || "#0f172a"} onChange={(e) => onCellPatch({ color: e.target.value })} className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" />
              </label>
              <label className="flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs text-slate-500" title="Cell fill">
                ▟
                <input
                  type="color"
                  defaultValue="#fef9c3"
                  onChange={(e) => onCellPatch({ fill: e.target.value })}
                  className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                />
                <button type="button" title="No fill" onClick={() => onCellPatch({ fill: "none" })} className="text-slate-400 hover:text-slate-700">✕</button>
              </label>
            </>
          )}
        </>
      )}

      <span className="ml-auto" />
      <Btn title="Delete element" onClick={onDelete}>
        🗑
      </Btn>
    </div>
  );
}
