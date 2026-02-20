"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type PrintMenuItem = {
  id: string;
  name: string;
  description: string | null;
  type: "ENTREE" | "SIDE";
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  sodium: number | null;
  isDessert: boolean;
  isSoup: boolean;
};

type PrintWeeklyMenuItem = {
  id: string;
  dayOfWeek: number;
  menuItem: PrintMenuItem;
};

type PrintWeeklyMenu = {
  id: string;
  weekStartDate: string;
  menuItems: PrintWeeklyMenuItem[];
};

const DAYS = [
  { num: 1, name: "MONDAY" },
  { num: 2, name: "TUESDAY" },
  { num: 3, name: "WEDNESDAY" },
  { num: 4, name: "THURSDAY" },
  { num: 5, name: "FRIDAY" },
];

function getWeekDates(weekStartDate: string): string[] {
  const dateStr = weekStartDate.split("T")[0];
  const [year, month, day] = dateStr.split("-").map(Number);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(year, month - 1, day + i);
    return `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
  });
}

function formatNutrition(item: PrintMenuItem): string {
  const parts: string[] = [];
  if (item.calories != null) parts.push(`Cals:${item.calories}`);
  if (item.fat != null) parts.push(`Fat:${item.fat}`);
  if (item.carbs != null) parts.push(`Carbs:${item.carbs}`);
  if (item.sodium != null) parts.push(`Sodium:${item.sodium}`);
  if (item.protein != null) parts.push(`Protein:${item.protein}`);
  return parts.join(" ");
}

export default function PrintMenuPage() {
  const params = useParams();
  const router = useRouter();
  const [weeklyMenu, setWeeklyMenu] = useState<PrintWeeklyMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasPrinted = useRef(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/admin/weekly-menus/${params.id}`);
        if (!res.ok) {
          if (res.status === 401) { router.push("/login"); return; }
          throw new Error("Failed to fetch");
        }
        setWeeklyMenu(await res.json());
      } catch (err) {
        setError(`Failed to load: ${err}`);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id, router]);

  useEffect(() => {
    if (weeklyMenu && !hasPrinted.current) {
      hasPrinted.current = true;
      setTimeout(() => window.print(), 400);
    }
  }, [weeklyMenu]);

  if (loading) return <div style={{ padding: 20, fontFamily: "Arial" }}>Loading menu for print...</div>;
  if (error) return <div style={{ padding: 20, color: "red", fontFamily: "Arial" }}>{error}</div>;
  if (!weeklyMenu) return <div style={{ padding: 20, fontFamily: "Arial" }}>Menu not found</div>;

  const weekDates = getWeekDates(weeklyMenu.weekStartDate);
  const allSides = weeklyMenu.menuItems.filter((item) => item.dayOfWeek === 0);
  const soups = allSides.filter((s) => s.menuItem.isSoup);
  const desserts = allSides.filter((s) => s.menuItem.isDessert);
  const starches = allSides.filter((s) => !s.menuItem.isSoup && !s.menuItem.isDessert);

  let sideCounter = 20;
  const soupNumbered = soups.map((s) => ({ ...s, sideNum: sideCounter++ }));
  const starchNumbered = starches.map((s) => ({ ...s, sideNum: sideCounter++ }));
  const dessertNumbered = desserts.map((s) => ({ ...s, sideNum: sideCounter++ }));

  // Column widths: 40% left entree + 40% right entree + 5×4% order grid = 100%
  const ORDER_LABELS = ["Entree", "Side 1", "Side 2", "Side 3", "Xtras"];

  return (
    <>
      <style>{`
        @media print {
          @page { size: letter landscape; margin: 0.35in; }
          .no-print { display: none !important; }
          html, body { height: 100%; margin: 0; padding: 0; }
          #print-menu {
            height: 100vh;
            max-width: none !important;
            margin: 0 !important;
            padding: 2px 4px !important;
            box-sizing: border-box;
          }
          .days-wrapper { flex: 1; min-height: 0; }
        }
        body { margin: 0; }
      `}</style>

      {/* Screen-only controls */}
      <div
        className="no-print"
        style={{
          padding: "12px 20px",
          background: "#f3f4f6",
          borderBottom: "1px solid #d1d5db",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <button
          onClick={() => window.print()}
          style={{
            padding: "8px 20px",
            background: "#b91c1c",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          🖨 Print Menu
        </button>
        <Link
          href={`/admin/weekly-menus/${weeklyMenu.id}`}
          style={{ color: "#b91c1c", textDecoration: "none", fontSize: "14px" }}
        >
          ← Back to Menu Builder
        </Link>
      </div>

      {/* ===== PRINTABLE CONTENT ===== */}
      <div
        id="print-menu"
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "9px",
          color: "#000",
          lineHeight: "1.25",
          padding: "6px 8px",
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* === HEADER === */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "3px",
            flexShrink: 0,
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  verticalAlign: "top",
                  width: "160px",
                  paddingRight: "8px",
                  borderRight: "1px solid #aaa",
                }}
              >
                <div
                  style={{
                    fontSize: "19px",
                    fontWeight: "900",
                    letterSpacing: "-0.5px",
                    lineHeight: 1,
                    marginBottom: "2px",
                  }}
                >
                  LATINLITE
                </div>
                <div style={{ fontSize: "7.5px", fontWeight: "bold" }}>
                  BY FAT BUSTERS &nbsp; 305-225-2999
                </div>
                <div style={{ fontSize: "7.5px" }}>Email: info@latinlite.com</div>
                <div style={{ fontSize: "7.5px" }}>latinlite.com - conditions apply</div>
              </td>
              <td style={{ verticalAlign: "top", paddingLeft: "10px" }}>
                <div style={{ marginBottom: "3px" }}>
                  Name:_____________________________&nbsp;&nbsp;&nbsp;&nbsp;EMAIL:_______________________________
                </div>
                <div style={{ marginBottom: "3px" }}>
                  Address:________________________________ City:___________ Zip:_________ Phone#:_____________________
                </div>
                <div>
                  CC#:________________________________ 3%CF - Save on file___ Exp.:_______ V Code_______ CC Billing Zip:_________
                </div>
              </td>
              <td
                style={{
                  verticalAlign: "top",
                  width: "110px",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "3px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "11px",
                      height: "11px",
                      border: "1.5px solid #000",
                      marginRight: "3px",
                      verticalAlign: "middle",
                    }}
                  />
                  Delivery
                </div>
                <div style={{ fontSize: "10px", fontWeight: "bold" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "11px",
                      height: "11px",
                      border: "1.5px solid #000",
                      marginRight: "3px",
                      verticalAlign: "middle",
                    }}
                  />
                  Pick-up
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* === PRICING BANNER === */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            borderTop: "2px solid #000",
            borderBottom: "2px solid #000",
            marginBottom: "3px",
            flexShrink: 0,
          }}
        >
          <tbody>
            <tr>
              <td style={{ verticalAlign: "middle", padding: "2px 6px", width: "185px" }}>
                <div style={{ fontWeight: "bold", fontSize: "11px" }}>5 days $66.89 per person</div>
                <div style={{ fontWeight: "bold", fontSize: "11px" }}>4 days $53.46 per person</div>
              </td>
              <td style={{ verticalAlign: "middle", textAlign: "center", padding: "2px" }}>
                <div style={{ fontSize: "17px", fontWeight: "900", color: "#c0392b" }}>
                  Eat healthy, feel GREAT!
                </div>
              </td>
              <td style={{ verticalAlign: "middle", padding: "2px 8px", width: "130px" }}>
                <div>Xtra entree $6.78</div>
                <div>Xtra side &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; $2.69</div>
              </td>
              <td
                style={{
                  verticalAlign: "middle",
                  padding: "2px 6px",
                  width: "210px",
                  color: "#00008B",
                }}
              >
                <div style={{ fontWeight: "bold" }}>You can replace any entree with:</div>
                <div>#11 Turkey Picadillo or #12 Masitas</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* === DAYS SECTION ===
            Uses flexbox (not a CSS table) so each day gets exactly 1/5 of the available height.
            CSS tables with height:100% on multiple rows give all space to the first row — flexbox
            with flex:1 on each day div distributes evenly and reliably.

            Visual structure per day:
              [day-header row]  40%+40% date/name span | Entree | Side1 | Side2 | Side3 | Xtras
              [day-content row] left-entree (40%) | right-entree (40%) | blank cells (4%×5)

            Continuous vertical lines: all days use identical column widths (box-sizing:border-box),
            so the grid column borders align at the same x-positions across all 5 days.
            The border-bottom of each day div separates it from the next, acting as the single
            shared line between days (no double borders).
        */}
        <div
          className="days-wrapper"
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            border: "1px solid #000",
            boxSizing: "border-box",
          }}
        >
          {DAYS.map((day, dayIdx) => {
            const dayEntrees = weeklyMenu.menuItems
              .filter(
                (item) => item.dayOfWeek === day.num && item.menuItem.type === "ENTREE"
              )
              .slice(0, 2);
            const [leftEntree, rightEntree] = dayEntrees;
            const num1 = dayIdx * 2 + 1;
            const num2 = dayIdx * 2 + 2;
            const dateStr = weekDates[dayIdx];
            const nut1 = leftEntree ? formatNutrition(leftEntree.menuItem) : "";
            const nut2 = rightEntree ? formatNutrition(rightEntree.menuItem) : "";
            const isLastDay = dayIdx === DAYS.length - 1;

            return (
              <div
                key={day.num}
                style={{
                  flex: 1,           // each day gets equal share of available height
                  display: "flex",
                  flexDirection: "column",
                  borderBottom: isLastDay ? "none" : "1px solid #000",
                  overflow: "hidden",
                }}
              >
                {/* — Day header row — */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    flexShrink: 0,
                    borderBottom: "1px solid #000",
                    background: "#f0f0f0",
                  }}
                >
                  {/* Date + day name — spans the full 80% entree area */}
                  <div
                    style={{
                      flex: "0 0 80%",
                      boxSizing: "border-box",
                      padding: "1px 6px",
                    }}
                  >
                    <em style={{ fontSize: "8px" }}>{dateStr}</em>
                    <span
                      style={{
                        marginLeft: 12,
                        fontWeight: "bold",
                        color: "blue",
                        fontSize: "10px",
                      }}
                    >
                      {day.name}
                    </span>
                  </div>

                  {/* Order column labels (each 4%, border-left creates the vertical divider) */}
                  {ORDER_LABELS.map((label) => (
                    <div
                      key={label}
                      style={{
                        flex: "0 0 4%",
                        boxSizing: "border-box",
                        borderLeft: "1px solid #000",
                        fontSize: "7px",
                        fontWeight: "bold",
                        textAlign: "center",
                        background: "#e8e8e8",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "1px",
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* — Day content row — fills remaining height within this day's flex section — */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "stretch",
                    overflow: "hidden",
                  }}
                >
                  {/* Left entree */}
                  <div
                    style={{
                      flex: "0 0 40%",
                      boxSizing: "border-box",
                      borderRight: "1px solid #ccc",
                      verticalAlign: "top",
                      padding: "3px 8px 4px",
                      overflow: "hidden",
                    }}
                  >
                    {leftEntree ? (
                      <>
                        <div>
                          <strong>
                            [{num1}] {leftEntree.menuItem.name}
                          </strong>
                        </div>
                        {leftEntree.menuItem.description && (
                          <div style={{ fontStyle: "italic", color: "#444", fontSize: "8px" }}>
                            ({leftEntree.menuItem.description})
                          </div>
                        )}
                        {nut1 && (
                          <div style={{ fontSize: "7.5px", color: "#444", marginTop: "2px" }}>
                            {nut1}
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ color: "#bbb", fontStyle: "italic" }}>—</span>
                    )}
                  </div>

                  {/* Right entree */}
                  <div
                    style={{
                      flex: "0 0 40%",
                      boxSizing: "border-box",
                      verticalAlign: "top",
                      padding: "3px 8px 4px",
                      overflow: "hidden",
                    }}
                  >
                    {rightEntree ? (
                      <>
                        <div>
                          <strong>
                            [{num2}] {rightEntree.menuItem.name}
                          </strong>
                        </div>
                        {rightEntree.menuItem.description && (
                          <div style={{ fontStyle: "italic", color: "#444", fontSize: "8px" }}>
                            ({rightEntree.menuItem.description})
                          </div>
                        )}
                        {nut2 && (
                          <div style={{ fontSize: "7.5px", color: "#444", marginTop: "2px" }}>
                            {nut2}
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ color: "#bbb", fontStyle: "italic" }}>—</span>
                    )}
                  </div>

                  {/* Blank order grid cells — border-left creates continuous vertical lines */}
                  {ORDER_LABELS.map((label) => (
                    <div
                      key={label}
                      style={{
                        flex: "0 0 4%",
                        boxSizing: "border-box",
                        borderLeft: "1px solid #000",
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* === FOOTER / SIDES === */}
        <div
          style={{
            borderTop: "2px solid #000",
            marginTop: "3px",
            paddingTop: "4px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "3px",
            }}
          >
            <span style={{ color: "#c0392b", fontSize: "7.5px" }}>
              Orders after 2pm choices may be replaced for first delivery
            </span>
            <span style={{ fontWeight: "bold", fontSize: "10px" }}>
              SIDES - Choose three (3) p/person
            </span>
            <span style={{ fontSize: "7.5px", color: "#555" }}>
              *We reserve the right to changes without prior notice
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                {/* Soups */}
                <td
                  style={{
                    verticalAlign: "top",
                    width: "33%",
                    paddingRight: "8px",
                    borderRight: "1px solid #ccc",
                  }}
                >
                  <div
                    style={{
                      color: "#c0392b",
                      fontStyle: "italic",
                      fontWeight: "bold",
                      fontSize: "8px",
                      marginBottom: "2px",
                    }}
                  >
                    Limit one (1) cream or soup per meal per day
                  </div>
                  {soupNumbered.length === 0 ? (
                    <div style={{ color: "#aaa", fontStyle: "italic" }}>No soups added</div>
                  ) : (
                    soupNumbered.map((s) => (
                      <div key={s.id} style={{ marginBottom: "2px" }}>
                        <strong>{s.sideNum}. {s.menuItem.name}</strong>
                        {s.menuItem.description && (
                          <span style={{ fontStyle: "italic", color: "#555", fontSize: "8px" }}>
                            {" "}({s.menuItem.description})
                          </span>
                        )}
                        {s.menuItem.calories != null && (
                          <span style={{ color: "#555" }}> Cals:{s.menuItem.calories}</span>
                        )}
                      </div>
                    ))
                  )}
                </td>

                {/* Starches / Veggies */}
                <td
                  style={{
                    verticalAlign: "top",
                    width: "34%",
                    padding: "0 8px",
                    borderRight: "1px solid #ccc",
                  }}
                >
                  {starchNumbered.length === 0 ? (
                    <div style={{ color: "#aaa", fontStyle: "italic" }}>No sides added</div>
                  ) : (
                    starchNumbered.map((s) => (
                      <div key={s.id} style={{ marginBottom: "2px" }}>
                        <strong>{s.sideNum}. {s.menuItem.name}</strong>
                        {s.menuItem.description && (
                          <span style={{ fontStyle: "italic", color: "#555", fontSize: "8px" }}>
                            {" "}({s.menuItem.description})
                          </span>
                        )}
                        {s.menuItem.calories != null && (
                          <span style={{ color: "#555" }}> Cals:{s.menuItem.calories}</span>
                        )}
                      </div>
                    ))
                  )}
                </td>

                {/* Desserts */}
                <td style={{ verticalAlign: "top", width: "33%", paddingLeft: "8px" }}>
                  <div
                    style={{
                      color: "#c0392b",
                      fontStyle: "italic",
                      fontWeight: "bold",
                      fontSize: "8px",
                      marginBottom: "2px",
                    }}
                  >
                    Limit one (1) dessert per meal per day
                  </div>
                  {dessertNumbered.length === 0 ? (
                    <div style={{ color: "#aaa", fontStyle: "italic" }}>No desserts added</div>
                  ) : (
                    dessertNumbered.map((s) => (
                      <div key={s.id} style={{ marginBottom: "2px" }}>
                        <strong>{s.sideNum}. {s.menuItem.name}</strong>
                        {s.menuItem.description && (
                          <span style={{ fontStyle: "italic", color: "#555", fontSize: "8px" }}>
                            {" "}({s.menuItem.description})
                          </span>
                        )}
                        {s.menuItem.calories != null && (
                          <span style={{ color: "#555" }}> Cals:{s.menuItem.calories}</span>
                        )}
                      </div>
                    ))
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
