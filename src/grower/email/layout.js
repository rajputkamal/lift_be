export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

export const paragraph = (value) =>
  `<p style="line-height:1.6;margin:12px 0">${escapeHtml(value)}</p>`;

// Presentation tables and cell padding survive email-client HTML sanitization.
export const wrap = (content) => `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      @media screen and (max-width:480px) {
        .email-content { padding:20px 16px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f3f6f2;color:#183325;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f6f2" style="width:100%;background:#f3f6f2">
      <tr>
        <td align="center" style="padding:24px 12px">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:640px;background:#ffffff;border-radius:12px">
            <tr>
              <td class="email-content" style="padding:28px 24px;color:#183325;font-family:Arial,sans-serif;overflow-wrap:break-word">
                <h1 style="font-size:24px;line-height:1.3;margin:0 0 24px">Micro Greens Kart</h1>
                ${content}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

function cells(values, heading = false) {
  const tag = heading ? "th" : "td";
  const border = heading ? "2px" : "1px";
  return values
    .map(
      (value) =>
        `<${tag} style="text-align:left;padding:8px;border-bottom:${border} solid #dce7dc">${escapeHtml(value)}</${tag}>`,
    )
    .join("");
}

export function table(headings, rows) {
  const header = headings
    ? `<thead><tr>${cells(headings, true)}</tr></thead>`
    : "";
  const body = rows.map((row) => `<tr>${cells(row)}</tr>`).join("");
  return `<div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${header}<tbody>${body}</tbody>
    </table>
  </div>`;
}
