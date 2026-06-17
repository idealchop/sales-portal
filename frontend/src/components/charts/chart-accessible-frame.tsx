import type { ReactNode } from "react";

type AccessibleChartFrameProps = {
  title: string;
  summary: string;
  headers: string[];
  rows: string[][];
  children: ReactNode;
};

/** Screen-reader fallback for Recharts visualizations. */
export function AccessibleChartFrame({
  title,
  summary,
  headers,
  rows,
  children,
}: AccessibleChartFrameProps) {
  return (
    <figure className="w-full">
      <div role="img" aria-label={summary}>
        {children}
      </div>
      <figcaption className="sr-only">{title}</figcaption>
      {rows.length > 0 ?
        <table className="sr-only">
          <caption>{title}</caption>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${index}-${row[0] ?? "row"}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${index}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      : null}
    </figure>
  );
}

export function seriesTableRows(
  data: Record<string, unknown>[],
  labelKey: string,
  valueKeys: { key: string; label: string }[],
): { headers: string[]; rows: string[][] } {
  const headers = [labelKey, ...valueKeys.map((col) => col.label)];
  const rows = data.map((row) => [
    String(row[labelKey] ?? ""),
    ...valueKeys.map((col) => String(row[col.key] ?? "")),
  ]);
  return { headers, rows };
}
