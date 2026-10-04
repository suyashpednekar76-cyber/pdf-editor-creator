"use client";

import { useEffect, useRef } from "react";
import type {
  Element,
  TextElement,
  TableElement,
  Align,
  FontFamily,
} from "@/lib/elements";

const cssFamily = (f: FontFamily) =>
  f === "Times"
    ? 'Georgia, "Times New Roman", serif'
    : f === "Courier"
    ? '"Courier New", monospace'
    : "Helvetica, Arial, sans-serif";

type DragMode =
  | { type: "move"; id: string }
  | { type: "resize"; id: string }
  | { type: "col"; id: string; col: number }
  | null;

export default function ElementsLayer({
  elements,
  scale,
  selectedId,
  selectedCell,
  onSelect,
  onChange,
}: {
  elements: Element[];
  scale: number;
  selectedId: string | null;
  selectedCell: [number, number] | null;
  onSelect: (id: string | null, cell?: [number, number] | null) => void;
  onChange: (id: string, patch: Partial<Element>) => void;
}) {
  const drag = useRef<DragMode>(null);

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.movementX / scale;
    const dy = e.movementY / scale;
    const el = elements.find((x) => x.id === d.id);
    if (!el) return;
    if (d.type === "move") {
      onChange(d.id, { x: el.x + dx, y: el.y + dy } as Partial<Element>);
    } else if (d.type === "resize" && el.kind === "text") {
      onChange(d.id, { width: Math.max(40, el.width + dx) } as Partial<Element>);
    } else if (d.type === "col" && el.kind === "table") {
      const cw = [...el.colWidths];
      cw[d.col] = Math.max(30, cw[d.col] + dx);
      onChange(d.id, { colWidths: cw } as Partial<Element>);
    }
  };
  const endDrag = () => (drag.current = null);

  return (
    <div
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      className="pointer-events-none absolute inset-0"
    >
      {elements.map((el) => {
        const selected = el.id === selectedId;
        const left = el.x * scale;
        const top = el.y * scale;

        const handles = selected && (
          <>
            <span
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                drag.current = { type: "move", id: el.id };
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
              }}
              title="Drag to move"
              className="pointer-events-auto absolute -left-3 -top-3 z-20 grid h-5 w-5 cursor-move place-items-center rounded bg-brand-500 text-[10px] text-white shadow"
            >
              ✜
            </span>
            {el.kind === "text" && (
              <span
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  drag.current = { type: "resize", id: el.id };
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                }}
                title="Drag to resize width"
                className="pointer-events-auto absolute -right-2 top-1/2 z-20 h-5 w-2 -translate-y-1/2 cursor-ew-resize rounded bg-brand-500 shadow"
              />
            )}
          </>
        );

        if (el.kind === "rect") {
          return (
            <div
              key={el.id}
              onPointerDown={(e) => { e.stopPropagation(); onSelect(el.id); }}
              className="pointer-events-auto absolute"
              style={{
                left,
                top,
                width: el.width * scale,
                height: el.height * scale,
                background: el.color,
                outline: selected ? "2px solid #e14504" : "none",
              }}
            >
              {handles}
            </div>
          );
        }

        if (el.kind === "image") {
          return (
            <img
              key={el.id}
              src={el.src}
              alt=""
              draggable={false}
              onPointerDown={(e) => { e.stopPropagation(); onSelect(el.id); }}
              className="pointer-events-auto absolute select-none"
              style={{
                left,
                top,
                width: el.width * scale,
                height: el.height * scale,
                outline: selected ? "2px solid #e14504" : "none",
              }}
            />
          );
        }

        if (el.kind === "text") {
          return (
            <div
              key={el.id}
              className="absolute"
              style={{ left, top, width: el.width * scale }}
            >
              {handles}
              <div
                onPointerDown={(e) => { e.stopPropagation(); onSelect(el.id); }}
                className="pointer-events-auto"
                style={{
                  fontFamily: cssFamily(el.fontFamily),
                  fontSize: el.fontSize * scale,
                  lineHeight: el.lineHeight,
                  color: el.color,
                  fontWeight: el.bold ? 700 : 400,
                  fontStyle: el.italic ? "italic" : "normal",
                  textDecoration:
                    [el.underline ? "underline" : "", el.strike ? "line-through" : ""]
                      .filter(Boolean)
                      .join(" ") || "none",
                  outline: selected ? "2px solid #e14504" : "1px dashed rgba(59,108,255,0.3)",
                  padding: 2,
                  cursor: "pointer",
                  wordBreak: "break-word",
                }}
              >
                <TextBody el={el} />
              </div>
            </div>
          );
        }

        // table
        return (
          <div key={el.id} className="absolute" style={{ left, top }}>
            {handles}
            <TableView
              el={el}
              scale={scale}
              selected={selected}
              selectedCell={selected ? selectedCell : null}
              onSelect={onSelect}
              onChange={onChange}
              startColDrag={(col, e) => {
                e.preventDefault();
                e.stopPropagation();
                drag.current = { type: "col", id: el.id, col };
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function TextBody({ el }: { el: TextElement }) {
  const paras = el.text.split("\n");
  let counter = 0;
  return (
    <>
      {paras.map((p, i) => {
        let marker = "";
        if (el.list === "bullet") marker = "•  ";
        else if (el.list === "number") {
          counter++;
          marker = `${counter}. `;
        }
        const align =
          el.align === "center" ? "center" : el.align === "right" ? "right" : "left";
        return (
          <div key={i} style={{ textAlign: align as any }}>
            {marker && <span>{marker}</span>}
            <span
              style={{
                backgroundColor: el.highlight !== "none" ? el.highlight : "transparent",
                // @ts-ignore vendor prop
                WebkitBoxDecorationBreak: "clone",
                boxDecorationBreak: "clone",
              }}
            >
              {p || "​"}
            </span>
          </div>
        );
      })}
    </>
  );
}

function TableView({
  el,
  scale,
  selected,
  selectedCell,
  onSelect,
  onChange,
  startColDrag,
}: {
  el: TableElement;
  scale: number;
  selected: boolean;
  selectedCell: [number, number] | null;
  onSelect: (id: string | null, cell?: [number, number] | null) => void;
  onChange: (id: string, patch: Partial<Element>) => void;
  startColDrag: (col: number, e: React.PointerEvent) => void;
}) {
  return (
    <table
      className="pointer-events-auto border-collapse"
      style={{ outline: selected ? "2px solid #e14504" : "none" }}
    >
      <tbody>
        {el.cells.map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) => {
              const isSel = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
              const fill =
                cell.fill !== "none"
                  ? cell.fill
                  : r === 0 && el.headerFill !== "none"
                  ? el.headerFill
                  : "transparent";
              return (
                <td
                  key={c}
                  style={{
                    position: "relative",
                    width: el.colWidths[c] * scale,
                    minWidth: el.colWidths[c] * scale,
                    border: `${el.borderWidth}px solid ${el.borderColor}`,
                    background: fill,
                    padding: el.cellPadding * scale,
                    verticalAlign: "top",
                    fontFamily: cssFamily(el.fontFamily),
                    fontSize: el.fontSize * scale,
                    color: cell.color,
                    fontWeight: cell.bold ? 700 : 400,
                    fontStyle: cell.italic ? "italic" : "normal",
                    textAlign: cell.align as any,
                    outline: isSel ? "2px solid #c43c03" : "none",
                  }}
                >
                  <CellEditor
                    value={cell.text}
                    onFocus={() => onSelect(el.id, [r, c])}
                    onInput={(text) => {
                      const cells = el.cells.map((rr) => rr.slice());
                      cells[r][c] = { ...cells[r][c], text };
                      onChange(el.id, { cells } as Partial<Element>);
                    }}
                  />
                  {r === 0 && (
                    <span
                      onPointerDown={(e) => startColDrag(c, e)}
                      title="Drag to resize column"
                      className="absolute -right-1 top-0 z-10 h-full w-2 cursor-ew-resize"
                    />
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CellEditor({
  value,
  onFocus,
  onInput,
}: {
  value: string;
  onFocus: () => void;
  onInput: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) ref.current.innerText = value;
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onPointerDown={(e) => e.stopPropagation()}
      onFocus={onFocus}
      onInput={(e) => onInput(e.currentTarget.innerText)}
      style={{ outline: "none", minHeight: "1em", whiteSpace: "pre-wrap" }}
    />
  );
}
